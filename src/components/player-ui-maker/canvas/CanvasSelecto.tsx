import React from "react";
import Selecto from "react-selecto";
import { useEditorStore } from "../store/useEditorStore";

interface CanvasSelectoProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const CanvasSelecto: React.FC<CanvasSelectoProps> = ({
  containerRef,
}) => {
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);

  return (
    <Selecto
      dragContainer={containerRef.current || undefined}
      selectableTargets={["[data-element-id]"]}
      selectByClick={false}
      selectFromInside={false}
      toggleContinueSelect={["shift"]}
      ratio={0}
      hitRate={20}
      onSelect={(e) => {
        const ids = e.selected
          .map((el) => el.getAttribute("data-element-id"))
          .filter(Boolean) as string[];

        setSelectedIds(ids);
      }}
    />
  );
};
