// src/components/auth/ButtonLoginGoogle.tsx
import React, { useEffect, useCallback, useRef } from "react";

// 1. Khai báo interface cho Window để TypeScript nhận diện thư viện Google
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            ux_mode?: "popup" | "redirect";
            login_uri?: string;
            callback?: (response: any) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: string | number;
              locale?: string;
            }
          ) => void;
        };
      };
    };
  }
}

const ButtonLoginGoogle: React.FC = () => {
  // 2. Ép kiểu (Type assertion) cho biến môi trường Vite
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080/api/v1";
  
  // 3. Khai báo kiểu cho useRef
  const initializedRef = useRef<boolean>(false);

  const initializeGoogleSignIn = useCallback(() => {
    if (!window.google?.accounts?.id || initializedRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      ux_mode: "redirect",
      login_uri: `${API_BASE_URL}/auth/google`,
    });

    const buttonContainer = document.getElementById("google-signin-button");
    if (buttonContainer) {
      window.google.accounts.id.renderButton(buttonContainer, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        locale: "vi_VN", 
        text: "signin_with",
        logo_alignment: "center",
        width: 400, // Thiết lập chiều rộng cố định giúp ổn định layout
      });
      initializedRef.current = true;
    }
  }, [GOOGLE_CLIENT_ID, API_BASE_URL]);

  useEffect(() => {
    // Nếu SDK đã sẵn sàng (do đã khai báo script async trong index.html)
    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
    } else {
      // Đợi sự kiện load của script thay vì dùng setInterval. Khai báo kiểu HTMLScriptElement
      const script = document.querySelector<HTMLScriptElement>('script[src*="gsi/client"]');
      if (script) {
        script.addEventListener("load", initializeGoogleSignIn);
      }
    }

    return () => {
      const script = document.querySelector<HTMLScriptElement>('script[src*="gsi/client"]');
      if (script) {
        script.removeEventListener("load", initializeGoogleSignIn);
      }
    };
  }, [initializeGoogleSignIn]);

  return (
    <div className="flex justify-center items-center w-full">
      <div
        id="google-signin-button"
        className=" flex justify-center"
        style={{ height: "44px", width: "400px" }}
      ></div>
    </div>
  );
};

export default ButtonLoginGoogle;