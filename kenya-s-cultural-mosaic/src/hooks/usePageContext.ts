// import { useLocation } from "react-router-dom";

// export function usePageContext() {
//   const location = useLocation();

//   return {
//     path: location.pathname,
//     fullUrl: window.location.href,
//     title: document.title
//   };
// }


// usePageContext.ts
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

type PageContext = {
  path: string;
  fullUrl: string;
  title: string;
};

export function usePageContext() {
  const location = useLocation();
  const pageContextRef = useRef<PageContext>({
    path: location.pathname,
    fullUrl: window.location.href,
    title: document.title
  });

  useEffect(() => {
    pageContextRef.current = {
      path: location.pathname,
      fullUrl: window.location.href,
      title: document.title
    };
  }, [location]);

  return pageContextRef;
}
