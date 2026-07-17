import express from "express";
import { translateTexts } from "../services/translationService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { texts, from = "en", to = "es" } = req.body ?? {};
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: "texts (array) es requerido" });
    }
    if (texts.length > 300) {
      return res.status(400).json({ error: "máximo 300 líneas por petición" });
    }

    const translated = await translateTexts(texts.map(String), String(from), String(to));
    res.json({ texts: translated });
  }
  catch (error) {
    console.error("[translate] Error:", error.message);
    res.status(502).json({ error: "No se pudo traducir" });
  }
});

export default router;
