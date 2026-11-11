# Instruccions per a l'execució local de la web

Aquesta carpeta conté scripts preparats per iniciar la web interactiva de l'assignatura **en local** amb un sol clic o comanda, tant a **Windows** com a **Linux**.

---

## 1. A Windows (`execucio-local/windows/`)

Pots utilitzar qualsevol d'aquestes dues opcions:

- **Opció 1 (fàcil, doble clic):**
  Fes doble clic sobre el fitxer:
  ```text
  execucio-local/windows/iniciar_web_windows.bat
  ```
- **Opció 2 (PowerShell):**
  Fes clic dret -> *Executa amb PowerShell* sobre:
  ```text
  execucio-local/windows/iniciar_web_windows.ps1
  ```

*Nota:* Si encara no tens Quarto instal·lat, l'script comprova el sistema i t'ofereix instal·lar-lo automàticament via `winget`.

---

## 2. A Linux / macOS (`execucio-local/linux/`)

Obre una terminal dins d'aquesta carpeta i executa:

```bash
# Donar permisos d'execució (només la primera vegada)
chmod +x execucio-local/linux/iniciar_web_linux.sh

# Iniciar la web
./execucio-local/linux/iniciar_web_linux.sh
```

---

## 3. Requisits generals

Tots els scripts utilitzen el motor oficial de [Quarto CLI](https://quarto.org/docs/get-started/). Un cop iniciat, s'obrirà el teu navegador web predeterminat a `http://localhost:XXXX` amb recàrrega en viu (*live-reload*), de manera que qualsevol canvi que facis a un document es reflectirà a l'instant.

Per aturar el servidor local en qualsevol moment, prem `CTRL + C` a la finestra de la consola.
