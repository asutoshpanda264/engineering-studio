import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { VISIBILITY_SYMBOL } from "@/lld-modeling/types";
import type { ClassDiagramNode } from "@/store/lldStore";
import { CornerBrackets } from "@/components/workshop/CornerBrackets";

/**
 * The three-compartment UML class box (name / fields / methods) — the
 * canvas equivalent of `ComponentNode.tsx` for this domain. Same bordered
 * `bg-bg-panel` card language and `CornerBrackets` selection treatment, so
 * `/lld/editor` reads as a sibling of `/workshop` rather than a different
 * product wearing the same theme.
 *
 * One target handle (left) and one source handle (right), matching
 * `ComponentNode.tsx`'s convention exactly — a class diagram reads fine
 * left-to-right or diagonally either way, and staying consistent with the
 * rest of the app beats omnidirectional handles a "correct editor"
 * milestone doesn't actually need.
 */
const HANDLE_CLASSES =
  "!size-2.5 !border-2 !border-bg-panel !bg-text-subtle !transition-colors hover:!bg-signal after:absolute after:-inset-2 after:content-['']";

function ClassNodeImpl({ data, selected }: NodeProps<ClassDiagramNode>) {
  const { name, stereotype, fields, methods } = data;

  return (
    <div
      data-node-card
      className={`group relative w-64 overflow-hidden border bg-bg-panel shadow-elevated
        transition-all duration-fast ease-standard
        ${selected ? "border-signal" : "border-border hover:-translate-y-0.5 hover:border-border-hover hover:shadow-dropdown"}`}
    >
      {selected && <CornerBrackets size={9} inset={-1} colorClassName="border-signal" />}

      <Handle type="target" position={Position.Left} className={HANDLE_CLASSES} />

      {/* Name compartment */}
      <div className="border-b border-border px-3 py-2 text-center">
        {stereotype === "interface" && (
          <p className="font-mono text-[10px] uppercase tracking-wide text-text-subtle">
            «interface»
          </p>
        )}
        <p
          className={`truncate text-sm font-semibold text-text ${
            stereotype === "abstract" ? "italic" : ""
          }`}
        >
          {name || "Untitled"}
        </p>
      </div>

      {/* Fields compartment — always rendered, even empty, per UML convention. */}
      <div className="min-h-[1.75rem] border-b border-border px-3 py-1.5">
        {fields.length === 0 ? (
          <p className="text-[11px] text-text-subtle">—</p>
        ) : (
          fields.map((field) => (
            <p key={field.id} className="truncate font-mono text-[11px] text-text-muted">
              <span className="text-text-subtle">{VISIBILITY_SYMBOL[field.visibility]}</span>{" "}
              <span className={field.isStatic ? "underline" : ""}>{field.name}</span>
              {field.type && <span className="text-text-subtle">: {field.type}</span>}
            </p>
          ))
        )}
      </div>

      {/* Methods compartment */}
      <div className="min-h-[1.75rem] px-3 py-1.5">
        {methods.length === 0 ? (
          <p className="text-[11px] text-text-subtle">—</p>
        ) : (
          methods.map((method) => (
            <p key={method.id} className="truncate font-mono text-[11px] text-text-muted">
              <span className="text-text-subtle">{VISIBILITY_SYMBOL[method.visibility]}</span>{" "}
              <span
                className={`${method.isStatic ? "underline" : ""} ${
                  method.isAbstract ? "italic" : ""
                }`}
              >
                {method.name}({method.params})
              </span>
              {method.returnType && <span className="text-text-subtle">: {method.returnType}</span>}
            </p>
          ))
        )}
      </div>

      <Handle type="source" position={Position.Right} className={HANDLE_CLASSES} />
    </div>
  );
}

export const ClassNode = memo(ClassNodeImpl);
