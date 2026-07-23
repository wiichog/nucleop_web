// Carga perezosa del SDK JS de Facebook y helper de login (solo se usa en LoginPage).
declare global {
  interface Window {
    FB?: {
      init: (opts: { appId: string; version: string; cookie?: boolean; xfbml?: boolean }) => void;
      login: (
        cb: (res: { authResponse?: { accessToken: string } | null; status: string }) => void,
        opts?: { scope: string },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

function loadFacebookSdk(appId: string): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, version: "v21.0", cookie: false, xfbml: false });
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/es_LA/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
  return loadPromise;
}

// Abre el diálogo de Facebook Login y resuelve con el access token del usuario.
export async function loginWithFacebook(appId: string): Promise<string> {
  await loadFacebookSdk(appId);
  return new Promise((resolve, reject) => {
    window.FB!.login(
      (res) => {
        if (res.status === "connected" && res.authResponse?.accessToken) {
          resolve(res.authResponse.accessToken);
        } else {
          reject(new Error("El inicio de sesión con Facebook fue cancelado."));
        }
      },
      { scope: "email public_profile" },
    );
  });
}
