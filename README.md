# **Interval Timer**

**Interval Timer** is a cross-platform timer application built with [Electron](https://www.electronjs.org/). It allows you to manage customizable interval timers with an intuitive UI, supports pausing and resuming, and features tray integration for quick access.

---

## **Features**

- Customizable interval duration.
- Multi-screen support for both small and large timer displays.
- Persistent settings to remember your last interval.
- System tray integration for quick controls:
  - Start/Stop the timer.
  - Change interval duration.
- Cross-platform compatibility:
  - **macOS**: DMG and ZIP packages.
  - **Windows**: EXE installer and portable version.
  - **Linux**: AppImage, DEB, and RPM packages.

---

## **Installation**

### **macOS**
1. Download the `.dmg` file from the [releases](#) page.
2. Open the file and drag the application into the **Applications** folder.

### **Windows**
1. Download the `.exe` file from the [releases](#) page.
2. Run the installer and follow the on-screen instructions.

### **Linux**
1. Download the appropriate package for your distribution:
   - `.AppImage`: For most distributions.
   - `.deb`: For Debian-based distributions (e.g., Ubuntu).
   - `.rpm`: For Red Hat-based distributions (e.g., Fedora).
2. Install the package using your package manager or run the `.AppImage` file directly.

---

## **Usage**

1. Launch the application.
2. At startup, set your preferred interval duration in seconds.
3. The timer will display on-screen and start counting down.
4. Use the tray menu for quick actions:
   - Pause/Resume the timer.
   - Adjust the interval duration.
5. Once the interval completes, a full-screen notification will appear.

---

## **Development**

### **Requirements**
- [Node.js](https://nodejs.org/)
- [Electron](https://www.electronjs.org/)
- [Electron Builder](https://www.electron.build/)

### **Setup**
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/interval-timer.git
   cd interval-timer
   ```
2. Install the dependencies:
   ```bash
    npm install
    ```
3. Start the application:
    ```bash
    npm start
    ```
4. Build the application:
    ```bash
    npm run build:all
    ```

You can also build for a specific one. The built files will be available in the dist/ directory.

<!-- license -->
## **License**
This project is licensed under the MIT License.