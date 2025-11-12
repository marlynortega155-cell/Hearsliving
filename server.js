import express from "express";
import multer from "multer";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// 📁 Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

// ⚠️ Render no mantiene carpetas locales como /uploads
//    Por eso servimos desde /tmp (temporal)
app.use("/tmp", express.static("/tmp"));

// ⚙️ Configurar multer para guardar archivos temporalmente en /tmp
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "/tmp"),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// 🔗 Conexión a PostgreSQL
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:tu_contraseña@localhost/catalogosdb",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// 🚀 Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 📤 Subir archivos PDF
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo" });
    }

    const { tipo } = req.body;
    const nombreArchivo = req.file.filename;
    const url = `${req.protocol}://${req.get("host")}/tmp/${nombreArchivo}`;

    // Guardar o actualizar registro en PostgreSQL
    await pool.query(
      `INSERT INTO catalogos (tipo, nombre, url)
       VALUES ($1, $2, $3)
       ON CONFLICT (tipo)
       DO UPDATE SET nombre = $2, url = $3`,
      [tipo, nombreArchivo, url]
    );

    res.json({ message: "Archivo subido correctamente ✅", url });
  } catch (error) {
    console.error("❌ Error al subir archivo:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 🗑️ Eliminar archivos PDF
app.delete("/delete/:tipo", async (req, res) => {
  const { tipo } = req.params;
  const filePath = path.join("/tmp", `${tipo}.pdf`);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Archivo eliminado: ${filePath}`);
    }

    await pool.query("DELETE FROM catalogos WHERE tipo = $1", [tipo]);
    res.json({ message: "Catálogo eliminado correctamente 🗑️" });
  } catch (error) {
    console.error("❌ Error al eliminar catálogo:", error);
    res.status(500).json({ error: "Error al eliminar catálogo" });
  }
});

// 🚀 Iniciar servidor
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Servidor en puerto ${port}`));
