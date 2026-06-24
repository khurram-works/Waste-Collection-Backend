import express from "express";

const router = express.Router();

router.get("/reverse-geocode", async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      {
        headers: {
          "User-Agent": "Smart Waste Platform",
        },
      }
    );

    const data = await response.json();
    return res.json({ address: data.display_name });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch address" });
  }
});

export default router;