import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  RELATIONSHIP_KIND_LABEL,
  VISIBILITY_SYMBOL,
} from "@/lld-modeling/types";
import type { ClassField, ClassMethod, ClassStereotype, Visibility } from "@/lld-modeling/types";
import type { UmlRelationshipKind } from "@/content/shared/lesson";
import { useLldStore } from "@/store/lldStore";
import { ChallengeBriefing } from "@/components/lld/ChallengeBriefing";

const STEREOTYPE_OPTIONS: { value: ClassStereotype; label: string }[] = [
  { value: "class", label: "Class" },
  { value: "interface", label: "Interface" },
  { value: "abstract", label: "Abstract class" },
];

const RELATIONSHIP_OPTIONS: { value: UmlRelationshipKind; label: string }[] = (
  Object.entries(RELATIONSHIP_KIND_LABEL) as [UmlRelationshipKind, string][]
).map(([value, label]) => ({ value, label }));

const VISIBILITY_ORDER: Visibility[] = ["public", "private", "protected", "package"];

/**
 * `/lld/editor`'s Inspector — same "explain whatever's selected" role as
 * `InspectorPanel.tsx`, cut down to what a static structural graph needs:
 * a class's name/stereotype/members, or a relationship's kind/multiplicity/
 * label. No live-metrics/cost/scenario sections — none of that exists here.
 */
export function InspectorPanel() {
  const selectedId = useLldStore((s) => s.selectedId);
  const selectedKind = useLldStore((s) => s.selectedKind);
  const nodes = useLldStore((s) => s.nodes);
  const edges = useLldStore((s) => s.edges);
  const activeChallengeId = useLldStore((s) => s.activeChallengeId);

  const selectedNode = selectedKind === "node" ? nodes.find((n) => n.id === selectedId) : undefined;
  const selectedEdge = selectedKind === "edge" ? edges.find((e) => e.id === selectedId) : undefined;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-bg-elevated">
      {selectedNode ? (
        <ClassInspector nodeId={selectedNode.id} data={selectedNode.data} />
      ) : selectedEdge ? (
        <EdgeInspector edgeId={selectedEdge.id} data={selectedEdge.data} />
      ) : activeChallengeId ? (
        // With nothing selected, there's no per-node config to show — same
        // reasoning the real Workshop's `InspectorPanel.tsx` documents for
        // its own scenario briefing: the empty state doubles as whatever
        // "what am I doing right now" context is active.
        <ChallengeBriefing challengeSlug={activeChallengeId} />
      ) : (
        <EmptyInspector />
      )}
    </aside>
  );
}

function EmptyInspector() {
  return (
    <Panel.Body className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text">Nothing selected</p>
      <p className="text-xs leading-relaxed text-text-subtle">
        Select a class to edit its name, fields, and methods. Select a
        relationship line to change its kind, multiplicity, or label.
      </p>
      <p className="text-xs leading-relaxed text-text-subtle">
        Connect two classes by dragging from one box&rsquo;s right-hand dot to
        another&rsquo;s left-hand dot — every new connection starts as a plain
        association until you pick a different kind here.
      </p>
    </Panel.Body>
  );
}

function ClassInspector({
  nodeId,
  data,
}: {
  nodeId: string;
  data: { name: string; stereotype: ClassStereotype; fields: ClassField[]; methods: ClassMethod[] };
}) {
  const updateClassMeta = useLldStore((s) => s.updateClassMeta);
  const removeNode = useLldStore((s) => s.removeNode);
  const addField = useLldStore((s) => s.addField);
  const updateField = useLldStore((s) => s.updateField);
  const removeField = useLldStore((s) => s.removeField);
  const addMethod = useLldStore((s) => s.addMethod);
  const updateMethod = useLldStore((s) => s.updateMethod);
  const removeMethod = useLldStore((s) => s.removeMethod);

  return (
    <>
      <Panel.Header
        title={data.stereotype === "interface" ? "Interface" : "Class"}
        accent
        action={
          <button
            type="button"
            onClick={() => removeNode(nodeId)}
            aria-label="Remove class"
            title="Remove this class from the diagram"
            className="text-text-subtle transition-colors duration-fast ease-standard hover:text-status-critical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        }
      />
      <Panel.Body className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Input
            label="Name"
            value={data.name}
            onChange={(e) => updateClassMeta(nodeId, { name: e.target.value })}
          />
          <Select
            label="Stereotype"
            value={data.stereotype}
            options={STEREOTYPE_OPTIONS}
            onChange={(e) => updateClassMeta(nodeId, { stereotype: e.target.value as ClassStereotype })}
          />
        </div>

        <MemberSection
          title="Fields"
          onAdd={() => addField(nodeId)}
        >
          {data.fields.length === 0 && <EmptyMembersHint kind="field" />}
          {data.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              onChange={(patch) => updateField(nodeId, field.id, patch)}
              onRemove={() => removeField(nodeId, field.id)}
            />
          ))}
        </MemberSection>

        <MemberSection
          title="Methods"
          onAdd={() => addMethod(nodeId)}
        >
          {data.methods.length === 0 && <EmptyMembersHint kind="method" />}
          {data.methods.map((method) => (
            <MethodRow
              key={method.id}
              method={method}
              onChange={(patch) => updateMethod(nodeId, method.id, patch)}
              onRemove={() => removeMethod(nodeId, method.id)}
            />
          ))}
        </MemberSection>
      </Panel.Body>
    </>
  );
}

function MemberSection({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">{title}</p>
        <Button variant="ghost" size="sm" icon={<Plus className="size-3.5" aria-hidden />} onClick={onAdd}>
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function EmptyMembersHint({ kind }: { kind: "field" | "method" }) {
  return <p className="text-xs text-text-subtle">No {kind}s yet.</p>;
}

/** Compact +/-/#/~ toggle row — the UML notation itself, not a text dropdown, since it's four glyphs a reader already knows from lesson 4. */
function VisibilityPicker({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (visibility: Visibility) => void;
}) {
  return (
    <div className="flex shrink-0 overflow-hidden border border-border" role="radiogroup" aria-label="Visibility">
      {VISIBILITY_ORDER.map((visibility) => (
        <button
          key={visibility}
          type="button"
          role="radio"
          aria-checked={value === visibility}
          title={visibility}
          onClick={() => onChange(visibility)}
          className={`flex size-7 items-center justify-center font-mono text-xs transition-colors duration-fast ease-standard
            ${value === visibility ? "bg-signal text-bg" : "text-text-muted hover:bg-bg-panel"}`}
        >
          {VISIBILITY_SYMBOL[visibility]}
        </button>
      ))}
    </div>
  );
}

function RemoveRowButton({ onRemove, label }: { onRemove: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      className="shrink-0 text-text-subtle transition-colors duration-fast ease-standard hover:text-status-critical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  );
}

function FieldRow({
  field,
  onChange,
  onRemove,
}: {
  field: ClassField;
  onChange: (patch: Partial<Omit<ClassField, "id">>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 border border-border bg-bg-panel p-2">
      <div className="flex items-center gap-1.5">
        <VisibilityPicker value={field.visibility} onChange={(visibility) => onChange({ visibility })} />
        <Input
          value={field.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="name"
          aria-label="Field name"
          className="!h-7 flex-1 text-xs"
        />
        <RemoveRowButton onRemove={onRemove} label="Remove field" />
      </div>
      <Input
        value={field.type}
        onChange={(e) => onChange({ type: e.target.value })}
        placeholder="type"
        aria-label="Field type"
        className="!h-7 text-xs"
      />
    </div>
  );
}

function MethodRow({
  method,
  onChange,
  onRemove,
}: {
  method: ClassMethod;
  onChange: (patch: Partial<Omit<ClassMethod, "id">>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 border border-border bg-bg-panel p-2">
      <div className="flex items-center gap-1.5">
        <VisibilityPicker value={method.visibility} onChange={(visibility) => onChange({ visibility })} />
        <Input
          value={method.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="name"
          aria-label="Method name"
          className="!h-7 flex-1 text-xs"
        />
        <RemoveRowButton onRemove={onRemove} label="Remove method" />
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={method.params}
          onChange={(e) => onChange({ params: e.target.value })}
          placeholder="params"
          aria-label="Method parameters"
          className="!h-7 flex-1 text-xs"
        />
        <Input
          value={method.returnType}
          onChange={(e) => onChange({ returnType: e.target.value })}
          placeholder="return type"
          aria-label="Method return type"
          className="!h-7 flex-1 text-xs"
        />
      </div>
      <div className="flex items-center gap-3 pt-0.5">
        <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <input
            type="checkbox"
            checked={Boolean(method.isAbstract)}
            onChange={(e) => onChange({ isAbstract: e.target.checked })}
            className="size-3 accent-signal"
          />
          abstract
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <input
            type="checkbox"
            checked={Boolean(method.isStatic)}
            onChange={(e) => onChange({ isStatic: e.target.checked })}
            className="size-3 accent-signal"
          />
          static
        </label>
      </div>
      <Input
        value={method.implementationNote ?? ""}
        onChange={(e) => onChange({ implementationNote: e.target.value })}
        placeholder="implementation note (optional) — e.g. throw new UnsupportedOperationException()"
        aria-label="Method implementation note"
        title="A short note on what this method actually does. The linter reads this to catch overrides that just throw instead of implementing the contract (LSP)."
        className="!h-7 text-xs"
      />
    </div>
  );
}

function EdgeInspector({
  edgeId,
  data,
}: {
  edgeId: string;
  data?: { kind: UmlRelationshipKind; fromMultiplicity?: string; toMultiplicity?: string; label?: string };
}) {
  const updateEdgeData = useLldStore((s) => s.updateEdgeData);
  const removeEdge = useLldStore((s) => s.removeEdge);
  const kind = data?.kind ?? "association";

  return (
    <>
      <Panel.Header
        title="Relationship"
        accent
        action={
          <button
            type="button"
            onClick={() => removeEdge(edgeId)}
            aria-label="Remove relationship"
            title="Remove this relationship"
            className="text-text-subtle transition-colors duration-fast ease-standard hover:text-status-critical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        }
      />
      <Panel.Body className="flex flex-col gap-3">
        <Badge variant="primary">{RELATIONSHIP_KIND_LABEL[kind]}</Badge>
        <Select
          label="Kind"
          value={kind}
          options={RELATIONSHIP_OPTIONS}
          onChange={(e) => updateEdgeData(edgeId, { kind: e.target.value as UmlRelationshipKind })}
        />
        <Input
          label="Label"
          value={data?.label ?? ""}
          onChange={(e) => updateEdgeData(edgeId, { label: e.target.value })}
          placeholder="e.g. has, teaches"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="From multiplicity"
            value={data?.fromMultiplicity ?? ""}
            onChange={(e) => updateEdgeData(edgeId, { fromMultiplicity: e.target.value })}
            placeholder="1"
          />
          <Input
            label="To multiplicity"
            value={data?.toMultiplicity ?? ""}
            onChange={(e) => updateEdgeData(edgeId, { toMultiplicity: e.target.value })}
            placeholder="0..*"
          />
        </div>
      </Panel.Body>
    </>
  );
}
