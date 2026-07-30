# Guía de Sincronización en la Nube con Firebase (Vercel)

¡Felicidades por publicar tu aplicación en **Vercel**! Como has notado, al ser una aplicación web estática, por defecto los datos se guardan en el almacenamiento local del navegador (`localStorage`) de cada dispositivo de forma aislada.

Para que tú, tu mamá y tu esposa puedan registrar datos desde **dispositivos diferentes** y que todos se actualicen **en tiempo real**, hemos preparado un sistema de sincronización híbrido en la aplicación que se activa automáticamente al configurar **Firebase**.

Sigue estos sencillos pasos para conectar tu base de datos en la nube gratuita:

---

## 🚀 Guía de 5 Minutos para Activar la Nube

### Paso 1: Crear un proyecto de Firebase (Gratis)
1. Entra a la consola de [Firebase Console](https://console.firebase.google.com/) con tu cuenta de Google.
2. Haz clic en **Agregar proyecto** (o "Add project") y ponle de nombre `Camino a Cero`.
3. Puedes desactivar Google Analytics para este proyecto si lo deseas (para que sea más rápido), y haz clic en **Crear proyecto**.

### Paso 2: Crear la Base de Datos (Firestore)
1. En el menú lateral izquierdo de Firebase, ve a **Build** > **Firestore Database**.
2. Haz clic en **Crear base de datos** ("Create database").
3. Elige la ubicación de tu servidor más cercana (ej. `us-east1` o `us-central1`).
4. Selecciona **Iniciar en modo de prueba** (esto es importante para que permita escribir y leer datos sin configurar autenticación compleja inicialmente). Haz clic en **Siguiente** y luego en **Habilitar**.

### Paso 3: Registrar una Aplicación Web en Firebase
1. En la pantalla principal de tu proyecto de Firebase, haz clic en el icono web (`</>`) para registrar una app.
2. Ponle un nombre como `camino-a-cero-web` y haz clic en **Registrar app**.
3. Verás un bloque de código con un objeto `firebaseConfig`. Copia los valores individuales de este objeto. Los necesitarás en el paso 4.

---

## Paso 4: Añadir las Variables de Entorno en Vercel
Para que tu sitio web en Vercel se conecte a tu base de datos de forma segura, ve al panel de tu proyecto en **Vercel** y añade las siguientes 6 variables de entorno en **Settings** > **Environment Variables**:

| Nombre de la Variable | Valor de tu Firebase Config |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | El valor de `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | El valor de `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | El valor de `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | El valor de `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | El valor de `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | El valor de `appId` |

*Nota: Asegúrate de que los nombres tengan el prefijo `VITE_` para que Vite pueda cargarlos correctamente en el navegador.*

### Paso 5: Desplegar de Nuevo en Vercel
Una vez que agregues las variables de entorno en Vercel:
1. Ve a la pestaña **Deployments** en Vercel.
2. Selecciona tu último despliegue, haz clic en los 3 puntos y elige **Redeploy** (o realiza un nuevo `git push` desde tu ordenador).

---

## 🎯 ¡Listo!
Cuando la aplicación se inicie, detectará de forma automática tus variables de Firebase:
- **Sincronización en Tiempo Real**: Si tu mamá registra una deuda en su teléfono, se reflejará instantáneamente en tu pantalla y la de tu esposa.
- **Sin Pérdida de Datos**: Aunque limpien el caché o cambien de navegador, las cuentas familiares estarán seguras en la nube.
- **Modo Offline de Respaldo**: Si no hay conexión o no has configurado Firebase, la aplicación seguirá guardando los datos localmente sin fallar.
