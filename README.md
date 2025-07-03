# Microservicios

Antes de comenzar, asegúrate de tener instalado lo siguiente:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- Git (opcional, para clonar el proyecto)

1. Clonar el repositorio
2. Ejecutar en la consola **docker compose build** para construir los contenedores
3. Ejecutar en la consola docker **compose up --scale user-service=3 --scale task-service=3 -d** para levantar los contenedores con 3 réplicas
