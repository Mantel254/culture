import { NavigateFunction } from "react-router-dom";

export function createAiActions(navigate: NavigateFunction) {
  return {
    navigate(url: string) {
      console.log("Navigating to:", url);
      navigate(url);
      // Scroll to top on navigation
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    highlight(selector: string) {
      console.log("Highlighting selector:", selector);
      
      // Try multiple selector strategies
      let el: HTMLElement | null = null;

      // Strategy 1: Direct selector
      if (!el) {
        el = document.querySelector(selector) as HTMLElement;
      }

      // Strategy 2: ID selector
      if (!el && !selector.includes("#")) {
        el = document.getElementById(selector);
      }

      // Strategy 3: Class selector
      if (!el && !selector.includes(".")) {
        el = document.querySelector(`.${selector}`) as HTMLElement;
      }

      // Strategy 4: Text content selector
      if (!el) {
        const elements = document.querySelectorAll("*");
        for (const element of elements) {
          if (element.textContent?.toLowerCase().includes(selector.toLowerCase())) {
            el = element as HTMLElement;
            break;
          }
        }
      }

      if (!el) {
        console.warn("Element not found for selector:", selector);
        return;
      }

      // Scroll into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Apply highlighting animation
      el.style.transition = "all 0.3s ease-in-out";
      el.style.backgroundColor = "rgba(255, 223, 0, 0.6)";
      el.style.boxShadow = "0 0 20px rgba(255, 223, 0, 0.8)";
      el.style.borderRadius = "4px";
      el.style.padding = "4px 8px";

      // Pulse animation
      el.style.animation = "pulse-highlight 0.6s ease-in-out 2";

      // Remove highlighting after 5 seconds
      setTimeout(() => {
        el!.style.backgroundColor = "";
        el!.style.boxShadow = "";
        el!.style.animation = "";
        el!.style.borderRadius = "";
        el!.style.padding = "";
      }, 5000);
    }
  };
}

// Add CSS animation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse-highlight {
      0%, 100% { 
        box-shadow: 0 0 20px rgba(255, 223, 0, 0.8);
      }
      50% { 
        box-shadow: 0 0 40px rgba(255, 223, 0, 1);
      }
    }
  `;
  document.head.appendChild(style);
}
