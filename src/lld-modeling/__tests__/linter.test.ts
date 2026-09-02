/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { lintClassDiagram } from "../linter";
import {
  createClassNodeData,
  createField,
  createMethod,
  createRelationshipEdgeData,
} from "../types";
import type { ClassDiagram, DiagramClassRef, DiagramRelationshipRef } from "../types";

let idCounter = 0;
function classRef(overrides: Partial<DiagramClassRef["data"]> = {}): DiagramClassRef {
  return { id: `class_${++idCounter}`, data: { ...createClassNodeData(), ...overrides } };
}
function relRef(
  source: string,
  target: string,
  kind: DiagramRelationshipRef["data"]["kind"]
): DiagramRelationshipRef {
  return { id: `rel_${++idCounter}`, source, target, data: createRelationshipEdgeData(kind) };
}
function diagram(classes: DiagramClassRef[], relationships: DiagramRelationshipRef[] = []): ClassDiagram {
  return { classes, relationships };
}

describe("lintClassDiagram — clean diagram", () => {
  it("reports nothing for an empty diagram", () => {
    expect(lintClassDiagram(diagram([]))).toEqual([]);
  });

  it("reports nothing for a small, well-formed diagram", () => {
    const parkingLot = classRef({ name: "ParkingLot", fields: [createField(), createField()], methods: [createMethod()] });
    const parkingFloor = classRef({ name: "ParkingFloor" });
    const findings = lintClassDiagram(
      diagram([parkingLot, parkingFloor], [relRef(parkingLot.id, parkingFloor.id, "composition")])
    );
    expect(findings).toEqual([]);
  });
});

describe("lintClassDiagram — SRP", () => {
  function classWithMemberCount(count: number): DiagramClassRef {
    const fields = Array.from({ length: count }, () => createField());
    return classRef({ name: "God", fields });
  }

  it("stays silent below the warning threshold (9 members)", () => {
    const findings = lintClassDiagram(diagram([classWithMemberCount(9)]));
    expect(findings.filter((f) => f.category === "SRP")).toEqual([]);
  });

  it("warns exactly at the warning threshold (10 members)", () => {
    const findings = lintClassDiagram(diagram([classWithMemberCount(10)]));
    const srp = findings.filter((f) => f.category === "SRP");
    expect(srp).toHaveLength(1);
    expect(srp[0].severity).toBe("warning");
  });

  it("stays a warning just below the critical threshold (14 members)", () => {
    const findings = lintClassDiagram(diagram([classWithMemberCount(14)]));
    expect(findings.filter((f) => f.category === "SRP")[0].severity).toBe("warning");
  });

  it("escalates to critical exactly at the critical threshold (15 members)", () => {
    const findings = lintClassDiagram(diagram([classWithMemberCount(15)]));
    const srp = findings.filter((f) => f.category === "SRP");
    expect(srp).toHaveLength(1);
    expect(srp[0].severity).toBe("critical");
    expect(srp[0].classId).toBeDefined();
  });

  it("counts fields and methods together", () => {
    const cls = classRef({
      name: "Mixed",
      fields: Array.from({ length: 5 }, () => createField()),
      methods: Array.from({ length: 10 }, () => createMethod()),
    });
    const findings = lintClassDiagram(diagram([cls]));
    expect(findings.filter((f) => f.category === "SRP")[0].severity).toBe("critical");
  });
});

describe("lintClassDiagram — LSP", () => {
  it("flags a subclass override whose implementation note signals a throw stub", () => {
    const vehicle = classRef({ name: "Vehicle", methods: [createMethod({ name: "refuel" })] });
    const electricCar = classRef({
      name: "ElectricCar",
      methods: [createMethod({ name: "refuel", implementationNote: "throw new UnsupportedOperationException()" })],
    });
    const findings = lintClassDiagram(
      diagram([vehicle, electricCar], [relRef(electricCar.id, vehicle.id, "inheritance")])
    );
    const lsp = findings.filter((f) => f.category === "LSP");
    expect(lsp).toHaveLength(1);
    expect(lsp[0].severity).toBe("critical");
    expect(lsp[0].classId).toBe(electricCar.id);
  });

  it("recognizes 'not implemented' phrasing, not just the word 'throw'", () => {
    const shape = classRef({ name: "Shape", methods: [createMethod({ name: "area" })] });
    const square = classRef({
      name: "Square",
      methods: [createMethod({ name: "area", implementationNote: "not implemented yet" })],
    });
    const findings = lintClassDiagram(diagram([shape, square], [relRef(square.id, shape.id, "realization")]));
    expect(findings.filter((f) => f.category === "LSP")).toHaveLength(1);
  });

  it("does not flag an override with a real implementation note", () => {
    const vehicle = classRef({ name: "Vehicle", methods: [createMethod({ name: "refuel" })] });
    const car = classRef({
      name: "Car",
      methods: [createMethod({ name: "refuel", implementationNote: "fills the tank from the pump" })],
    });
    const findings = lintClassDiagram(diagram([vehicle, car], [relRef(car.id, vehicle.id, "inheritance")]));
    expect(findings.filter((f) => f.category === "LSP")).toEqual([]);
  });

  it("does not flag a method with no implementation note at all", () => {
    const vehicle = classRef({ name: "Vehicle", methods: [createMethod({ name: "refuel" })] });
    const car = classRef({ name: "Car", methods: [createMethod({ name: "refuel" })] });
    const findings = lintClassDiagram(diagram([vehicle, car], [relRef(car.id, vehicle.id, "inheritance")]));
    expect(findings.filter((f) => f.category === "LSP")).toEqual([]);
  });

  it("ignores a throw-stub method that isn't actually an override of the superclass", () => {
    const vehicle = classRef({ name: "Vehicle", methods: [createMethod({ name: "refuel" })] });
    const car = classRef({
      name: "Car",
      methods: [createMethod({ name: "honk", implementationNote: "throw new Error()" })],
    });
    const findings = lintClassDiagram(diagram([vehicle, car], [relRef(car.id, vehicle.id, "inheritance")]));
    expect(findings.filter((f) => f.category === "LSP")).toEqual([]);
  });

  it("only looks at inheritance/realization edges, not plain association", () => {
    const vehicle = classRef({ name: "Vehicle", methods: [createMethod({ name: "refuel" })] });
    const car = classRef({
      name: "Car",
      methods: [createMethod({ name: "refuel", implementationNote: "throw new Error()" })],
    });
    const findings = lintClassDiagram(diagram([vehicle, car], [relRef(car.id, vehicle.id, "association")]));
    expect(findings.filter((f) => f.category === "LSP")).toEqual([]);
  });
});

describe("lintClassDiagram — DIP", () => {
  it("flags a concrete class depending directly on another concrete class that already implements an interface", () => {
    const paymentProcessor = classRef({ name: "PaymentProcessor", stereotype: "interface" });
    const stripeProcessor = classRef({ name: "StripeProcessor", stereotype: "class" });
    const checkout = classRef({ name: "Checkout", stereotype: "class" });
    const findings = lintClassDiagram(
      diagram(
        [paymentProcessor, stripeProcessor, checkout],
        [
          relRef(stripeProcessor.id, paymentProcessor.id, "realization"),
          relRef(checkout.id, stripeProcessor.id, "dependency"),
        ]
      )
    );
    const dip = findings.filter((f) => f.category === "DIP");
    expect(dip).toHaveLength(1);
    expect(dip[0].severity).toBe("warning");
    expect(dip[0].classId).toBe(checkout.id);
    expect(dip[0].edgeId).toBeDefined();
  });

  it("does not flag concrete-to-concrete coupling when no mediating interface exists", () => {
    const stripeProcessor = classRef({ name: "StripeProcessor", stereotype: "class" });
    const checkout = classRef({ name: "Checkout", stereotype: "class" });
    const findings = lintClassDiagram(
      diagram([stripeProcessor, checkout], [relRef(checkout.id, stripeProcessor.id, "dependency")])
    );
    expect(findings.filter((f) => f.category === "DIP")).toEqual([]);
  });

  it("does not flag a class that already depends on the interface directly", () => {
    const paymentProcessor = classRef({ name: "PaymentProcessor", stereotype: "interface" });
    const stripeProcessor = classRef({ name: "StripeProcessor", stereotype: "class" });
    const checkout = classRef({ name: "Checkout", stereotype: "class" });
    const findings = lintClassDiagram(
      diagram(
        [paymentProcessor, stripeProcessor, checkout],
        [
          relRef(stripeProcessor.id, paymentProcessor.id, "realization"),
          relRef(checkout.id, paymentProcessor.id, "dependency"),
        ]
      )
    );
    expect(findings.filter((f) => f.category === "DIP")).toEqual([]);
  });

  it("does not flag coupling that already runs through an interface/abstract endpoint", () => {
    const logger = classRef({ name: "Logger", stereotype: "interface" });
    const service = classRef({ name: "Service", stereotype: "class" });
    const findings = lintClassDiagram(diagram([logger, service], [relRef(service.id, logger.id, "association")]));
    expect(findings.filter((f) => f.category === "DIP")).toEqual([]);
  });

  it("does not flag inheritance/realization edges themselves as coupling", () => {
    const paymentProcessor = classRef({ name: "PaymentProcessor", stereotype: "interface" });
    const stripeProcessor = classRef({ name: "StripeProcessor", stereotype: "class" });
    const findings = lintClassDiagram(diagram([paymentProcessor, stripeProcessor], [relRef(stripeProcessor.id, paymentProcessor.id, "realization")]));
    expect(findings.filter((f) => f.category === "DIP")).toEqual([]);
  });
});

describe("lintClassDiagram — Strategy", () => {
  it("flags a cluster of 3+ methods sharing a camelCase-aligned prefix", () => {
    const pricer = classRef({
      name: "DiscountCalculator",
      methods: [
        createMethod({ name: "applyDiscountRegular" }),
        createMethod({ name: "applyDiscountPremium" }),
        createMethod({ name: "applyDiscountVip" }),
      ],
    });
    const findings = lintClassDiagram(diagram([pricer]));
    const strategy = findings.filter((f) => f.category === "Strategy");
    expect(strategy).toHaveLength(1);
    expect(strategy[0].severity).toBe("info");
    expect(strategy[0].classId).toBe(pricer.id);
    expect(strategy[0].relatedLessonHref).toBe("/lld/behavioral-patterns#strategy");
  });

  it("does not flag only 2 similarly-named methods", () => {
    const pricer = classRef({
      name: "DiscountCalculator",
      methods: [createMethod({ name: "applyDiscountRegular" }), createMethod({ name: "applyDiscountPremium" })],
    });
    const findings = lintClassDiagram(diagram([pricer]));
    expect(findings.filter((f) => f.category === "Strategy")).toEqual([]);
  });

  it("does not flag methods whose shared prefix is too short", () => {
    const shapes = classRef({
      name: "Utils",
      methods: [createMethod({ name: "run" }), createMethod({ name: "runFast" }), createMethod({ name: "runSlow" })],
    });
    const findings = lintClassDiagram(diagram([shapes]));
    expect(findings.filter((f) => f.category === "Strategy")).toEqual([]);
  });

  it("does not flag an unrelated mix of methods", () => {
    const repository = classRef({
      name: "UserRepository",
      methods: [createMethod({ name: "save" }), createMethod({ name: "delete" }), createMethod({ name: "findById" })],
    });
    const findings = lintClassDiagram(diagram([repository]));
    expect(findings.filter((f) => f.category === "Strategy")).toEqual([]);
  });

  it("does not flag an interface's own method cluster — the contract isn't the switch", () => {
    const shape = classRef({
      name: "ShapeRenderer",
      stereotype: "interface",
      methods: [
        createMethod({ name: "renderCircle" }),
        createMethod({ name: "renderSquare" }),
        createMethod({ name: "renderTriangle" }),
      ],
    });
    const findings = lintClassDiagram(diagram([shape]));
    expect(findings.filter((f) => f.category === "Strategy")).toEqual([]);
  });
});

describe("lintClassDiagram — Factory Method", () => {
  it("flags a class coupled to 2+ concrete siblings that share an interface", () => {
    const notifier = classRef({ name: "NotificationChannel", stereotype: "interface" });
    const emailChannel = classRef({ name: "EmailChannel", stereotype: "class" });
    const smsChannel = classRef({ name: "SmsChannel", stereotype: "class" });
    const notificationService = classRef({ name: "NotificationService", stereotype: "class" });

    const findings = lintClassDiagram(
      diagram(
        [notifier, emailChannel, smsChannel, notificationService],
        [
          relRef(emailChannel.id, notifier.id, "realization"),
          relRef(smsChannel.id, notifier.id, "realization"),
          relRef(notificationService.id, emailChannel.id, "dependency"),
          relRef(notificationService.id, smsChannel.id, "dependency"),
        ]
      )
    );

    const factory = findings.filter((f) => f.category === "Factory Method");
    expect(factory).toHaveLength(1);
    expect(factory[0].severity).toBe("info");
    expect(factory[0].classId).toBe(notificationService.id);
    expect(factory[0].relatedLessonHref).toBe("/lld/creational-patterns#factory-method");
  });

  it("does not flag a class coupled to only one implementation", () => {
    const notifier = classRef({ name: "NotificationChannel", stereotype: "interface" });
    const emailChannel = classRef({ name: "EmailChannel", stereotype: "class" });
    const notificationService = classRef({ name: "NotificationService", stereotype: "class" });

    const findings = lintClassDiagram(
      diagram(
        [notifier, emailChannel, notificationService],
        [
          relRef(emailChannel.id, notifier.id, "realization"),
          relRef(notificationService.id, emailChannel.id, "dependency"),
        ]
      )
    );
    expect(findings.filter((f) => f.category === "Factory Method")).toEqual([]);
  });

  it("does not flag two concrete classes coupled together with no shared supertype", () => {
    const engine = classRef({ name: "Engine", stereotype: "class" });
    const wheel = classRef({ name: "Wheel", stereotype: "class" });
    const car = classRef({ name: "Car", stereotype: "class" });

    const findings = lintClassDiagram(
      diagram([engine, wheel, car], [relRef(car.id, engine.id, "composition"), relRef(car.id, wheel.id, "composition")])
    );
    expect(findings.filter((f) => f.category === "Factory Method")).toEqual([]);
  });

  it("does not treat a concrete common superclass as a mediating abstraction", () => {
    const vehicle = classRef({ name: "Vehicle", stereotype: "class" });
    const car = classRef({ name: "Car", stereotype: "class" });
    const truck = classRef({ name: "Truck", stereotype: "class" });
    const fleetManager = classRef({ name: "FleetManager", stereotype: "class" });

    const findings = lintClassDiagram(
      diagram(
        [vehicle, car, truck, fleetManager],
        [
          relRef(car.id, vehicle.id, "inheritance"),
          relRef(truck.id, vehicle.id, "inheritance"),
          relRef(fleetManager.id, car.id, "association"),
          relRef(fleetManager.id, truck.id, "association"),
        ]
      )
    );
    expect(findings.filter((f) => f.category === "Factory Method")).toEqual([]);
  });
});

describe("lintClassDiagram — ordering", () => {
  it("sorts findings critical, then warning, then info", () => {
    const godClass = classRef({ name: "God", fields: Array.from({ length: 15 }, () => createField()) });
    const paymentProcessor = classRef({ name: "PaymentProcessor", stereotype: "interface" });
    const stripeProcessor = classRef({ name: "StripeProcessor", stereotype: "class" });
    const checkout = classRef({ name: "Checkout", stereotype: "class" });

    const findings = lintClassDiagram(
      diagram(
        [godClass, paymentProcessor, stripeProcessor, checkout],
        [
          relRef(stripeProcessor.id, paymentProcessor.id, "realization"),
          relRef(checkout.id, stripeProcessor.id, "dependency"),
        ]
      )
    );

    expect(findings[0].severity).toBe("critical");
    expect(findings.at(-1)!.severity).not.toBe("critical");
  });
});
