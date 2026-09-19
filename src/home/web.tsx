import React from "react";
import { createRoot } from "react-dom/client";
import { HomeLabels } from "./HomeLabels";
const root = document.getElementById("home-labels");
if (root)
  createRoot(root).render(
    <HomeLabels language={document.documentElement.lang || "en"} />,
  );
