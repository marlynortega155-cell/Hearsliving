import express from "express";
import multer from "multer";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // 🔥 sirve los archivos estáticos

// Configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://hearsliving_db_user:9dP1XXznHWEtCSi8RxFKvRig6q2T0VAx@dpg-d493h8ur433s73acu8b0-a/hearsliving_db",
  ssl: { rejectUnauthorized: false }
});

// Ruta para subir archivos
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { tipo } = req.body;
    const nombreArchivo = req.file.filename;
    const url = `http://localhost:3000/uploads/${nombreArchivo}`;

    await pool.query(
      "INSERT INTO catalogos (tipo, nombre, url) VALUES ($1, $2, $3) ON CONFLICT (tipo) DO UPDATE SET nombre = $2, url = $3",
      [tipo, nombreArchivo, url]
    );

    res.json({ message: "Archivo subido correctamente ✅", url });
  } catch (error) {
    console.error("Error al subir archivo:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});
import fs from "fs";

// Ruta para eliminar catálogo
app.delete("/delete/:tipo", async (req, res) => {
  const { tipo } = req.params;
  const filePath = path.join(__dirname, "uploads", `${tipo}.pdf`);

  try {
    // 1️⃣ Eliminar el archivo físico si existe
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Archivo eliminado: ${filePath}`);
    } else {
      console.warn(`Archivo no encontrado: ${filePath}`);
    }

    // 2️⃣ Eliminar registro de la base de datos
    await pool.query("DELETE FROM catalogos WHERE tipo = $1", [tipo]);

    res.json({ message: "Catálogo eliminado correctamente 🗑️" });
  } catch (error) {
    console.error("Error al eliminar catálogo:", error);
    res.status(500).json({ error: "Error al eliminar catálogo" });
  }
});

pp.use(express.static(__dirname)); 

// Ruta principal: mostrar index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Iniciar servidor
app.listen(3000, () => console.log("Servidor en http://localhost:3000"));
// Nota: Asegúrate de tener una tabla "catalogos" en tu base de datos PostgreSQL con las columnas adecuadas.
// La tabla puede crearse con la siguiente consulta SQL:
// CREATE TABLE catalogos (tipo VARCHAR(50) PRIMARY KEY, nombre VARCHAR(255), url TEXT);  