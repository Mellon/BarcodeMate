import React from "react";
import { createRoot } from "react-dom/client";
import { Warehouse } from "./Warehouse";
const root = document.getElementById("warehouse");
if (root)
  createRoot(root).render(
    <Warehouse language={document.documentElement.lang || "en"} />,
  );
