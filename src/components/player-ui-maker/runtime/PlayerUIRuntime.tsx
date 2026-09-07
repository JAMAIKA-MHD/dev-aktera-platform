import React, { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UIProject, ScreenId, Screen } from "../types";
import { RenderedElement } from "./RenderedElement";
import { computeElementPixelRect } from "../utils/transformUtils";
import { fireWinConfetti } from "../utils/confettiUtils";

export interface PlayerUIRuntimeProps {
  project: UIProject;
  activeScreen: ScreenId;
  data?: Record<string, any>;
  onAction?: (actionName: string, payload?: any) => void;
  activeEvent?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Standalone Player UI Runtime Renderer
 * Renders the serialized JSON UIProject cleanly in live games with 0 editor chrome.
 */
export const PlayerUIRuntime: React.FC<PlayerUIRuntimeProps> = ({
  project,
  activeScreen,
  data = {},
  onAction,
  activeEvent,
  className = "",
  style = {},
}) => {
  const screen: Screen =
    project.screens[activeScreen] || project.screens.pregame;

  // Screen background style
  const backgroundStyle = useMemo<React.CSSProperties>(() => {
    if (!screen?.background) return { backgroundColor: "#F0F2F5" };
    const { type, value } = screen.background;
    if (type === "gradient") return { background: value };
    if (type === "color") return { backgroundColor: value };
    if (type === "image") {
      return {
        backgroundImage: `url(${value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return { backgroundColor: "#F0F2F5" };
  }, [screen]);

  // Imperative Screen Enter Celebration Effect (e.g. Win Confetti)
  useEffect(() => {
    if (screen?.celebrationEffect === "confetti" || activeScreen === "win") {
      fireWinConfetti();
    }
  }, [activeScreen, screen?.celebrationEffect]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({
    width: 960,
    height: 540,
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={{ ...backgroundStyle, ...style }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={screen.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: (screen.transitionIn?.duration ?? 350) / 1000,
            ease: "easeOut",
          }}
          className="absolute inset-0 w-full h-full"
        >
          {screen.elements
            .filter((el) => !el.hidden)
            .map((element) => {
              const pixelRect = computeElementPixelRect(
                element.transform,
                containerSize.width,
                containerSize.height,
              );

              return (
                <div
                  key={element.id}
                  style={{
                    position: "absolute",
                    left: `${pixelRect.left}px`,
                    top: `${pixelRect.top}px`,
                    width: `${pixelRect.width}px`,
                    height: `${pixelRect.height}px`,
                    transform: `rotate(${pixelRect.rotation}deg)`,
                    transformOrigin: "center center",
                    zIndex: pixelRect.zIndex,
                  }}
                >
                  <RenderedElement
                    element={element}
                    data={data}
                    onAction={onAction}
                    activeEvent={activeEvent}
                    mode="runtime"
                  />
                </div>
              );
            })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
