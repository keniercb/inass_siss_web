# INASS SISS Web — Documentación

Repositorio compartido para coordinar el desarrollo del frontend del **Sistema de Gestión de Pensionados (INASS SISS Web)** entre el equipo backend y frontend.

## Estructura

```
inass_siss_web/
├── docs/
│   ├── backend/                      # ← Documentación provista por el equipo backend
│   │   ├── 01_Requisitos_funcionales.md
│   │   ├── 02_Diseno_de_arquitectura.md
│   │   ├── 03_Modelo_de_datos.md
│   │   ├── 04_Plan_de_desarrollo.md
│   │   ├── docs.json                # Contrato OpenAPI (cambia por sprints)
│   │   └── mdeditor.a8RzJZB8.md
│   └── frontend/                    # ← Entregables frontend (generados por el arquitecto)
│       ├── 01_Requisitos_Funcionales_Frontend.md
│       ├── 02_Diseno_Arquitectura_Frontend.md
│       └── 03_Plan_De_Desarrollo_Frontend.md
├── scripts/                         # Scripts de generación (opcional)
└── README.md                        # Este archivo
```

## Flujo de trabajo

1. **Equipo backend**: coloca los 6 archivos en `docs/backend/` y hace `git push`.
2. **Arquitecto frontend**: hace `git pull`, analiza los documentos, genera los 3 MD en `docs/frontend/` y hace `git push`.
3. **Equipo backend**: hace `git pull` para revisar los entregables frontend.
4. Cuando `docs/backend/docs.json` cambie (nuevo sprint backend), repetir desde paso 2.

## Convenciones

- Rama principal: `main`.
- Idioma: español.
- Codificación: UTF-8.
- Line endings: LF (no CRLF).
- Si `docs.json` supera los 50 MB, activar Git LFS.
