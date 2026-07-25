# Para aprender más sobre cómo usar Nix para configurar tu entorno
# visita: https://google.com
{ pkgs, ... }: {
  # Canal de nixpkgs a utilizar
  channel = "stable-23.11";

  # Paquetes y herramientas del sistema
  packages = [
    pkgs.nodejs_20
    pkgs.python3
  ];

  # Variables de entorno del espacio de trabajo
  env = {};

  idx = {
    # Extensiones de VS Code que se instalarán automáticamente
    extensions = [
      "google.gemini-cli-vscode-ide-companion"
      "greenwall.android-emulator"  # Extensión de Huy Nguyen para controlar emuladores
    ];

    # Configuración de previsualizaciones en tiempo real
    previews = {
      enable = true;
      previews = {
        # Previsualización para aplicaciones Web
        web = {
          command = ["python3" "-m" "http.server" "$PORT" "--bind" "0.0.0.0"];
          manager = "web";
        };
        # Previsualización nativa para emulador de Android en la nube
        android = {
          manager = "android";
        };
      };
    };

    # Ciclo de vida del espacio de trabajo
    workspace = {
      # Se ejecuta cuando el entorno se crea por primera vez
      onCreate = {
        # Archivos que se abrirán por defecto al iniciar
        default.openFiles = [ "style.css" "main.js" "index.html" ];
      };
      # Se ejecuta cada vez que el espacio de trabajo se inicia o reinicia
      onStart = {
        # Puedes añadir comandos en segundo plano aquí si los necesitas
      };
    };
  };
}
