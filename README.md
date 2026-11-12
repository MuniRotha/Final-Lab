# Student Management System (Microservices, Docker, Kubernetes)

A REST API for storing, updating and retrieving student records. It is split into three Node.js/Express microservices, each in its own Docker container, deployed to Minikube as two pods. MongoDB Atlas is the database.

| Service | Port | Pod | Job |
|---|---|---|---|
| api-gateway | 4000 | Pod 1 | Single entry point. Every request goes through here. |
| registration-service | 4001 | Pod 1 | Register a student, list students, get one student |
| update-service | 4002 | Pod 2 | Update a student's mobile number or password |

```
Postman ──> api-gateway-service (NodePort 30080)
              │
              ▼
   ┌──────── Pod 1 ─────────┐            ┌──── Pod 2 ─────┐
   │ api-gateway :4000      │──────────> │ update-service │
   │   │ localhost:4001     │  update-   │     :4002      │
   │   ▼                    │  service   └───────┬────────┘
   │ registration-service   │  (ClusterIP)       │
   └──────────┬─────────────┘                    │
              └──────────> MongoDB Atlas <────────┘
```

Containers in the same pod share a network, so the gateway reaches registration on `localhost:4001`. The update service lives in a different pod, so the gateway reaches it through the `update-service` Kubernetes Service.

## Database schema

Collection `students`:

| Field | Type | Notes |
|---|---|---|
| Student_id | Number | Auto-increment (1, 2, 3...) |
| Student_name | String | required |
| student_mobile | String | required |
| student_email | String | required, unique |
| student_password | String | stored as a bcrypt hash, never returned by the API |

## API (all through the gateway)

| Method | Route | Goes to | Body |
|---|---|---|---|
| GET | /health | gateway | |
| POST | /api/register | registration | `Student_name, student_mobile, student_email, student_password` |
| GET | /api/students | registration | |
| GET | /api/students/:id | registration | |
| PUT | /api/students/:id/mobile | update | `{ "student_mobile": "098765432" }` |
| PUT | /api/students/:id/password | update | `{ "old_password": "...", "new_password": "..." }` |

`postman_collection.json` has all of these ready to import.

---

## Run it (PowerShell)

### 1. Build and push the images

```powershell
docker login

docker build -t munirotha/student-api-gateway:v1 .\api-gateway
docker build -t munirotha/student-registration-service:v1 .\registration-service
docker build -t munirotha/student-update-service:v1 .\update-service

docker push munirotha/student-api-gateway:v1
docker push munirotha/student-registration-service:v1
docker push munirotha/student-update-service:v1
```

### 2. Start Minikube and add the MongoDB secret

```powershell
minikube start
kubectl create secret generic mongo-secret --from-literal=MONGO_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/studentdb?retryWrites=true&w=majority"
```

In Atlas, under Network Access, allow `0.0.0.0/0` or the pods won't be able to connect.

### 3. Deploy

```powershell
kubectl apply -f .\k8s\deployment.yaml
kubectl apply -f .\k8s\service.yaml

kubectl get pods        # expect 2 pods: gateway-registration-... (2/2) and update-deployment-... (1/1)
kubectl get svc
```

### 4. Get the gateway URL

```powershell
minikube service api-gateway-service --url
```

Leave that window open (on Windows with the Docker driver it holds a tunnel) and use the printed URL in Postman as `baseUrl`.

Dashboard for screenshots: `minikube dashboard`

### Useful checks

```powershell
kubectl logs deploy/gateway-registration-deployment -c api-gateway
kubectl logs deploy/gateway-registration-deployment -c registration-service
kubectl logs deploy/update-deployment
kubectl describe pod <pod-name>
```

If a pod says `ErrImagePull`, the image name in `deployment.yaml` doesn't match what you pushed. If it says `CrashLoopBackOff`, check the logs; it is almost always the Mongo URI or Atlas network access.

### Optional: quick local test without Kubernetes

```powershell
docker compose up --build
```

That uses a local Mongo container, and the gateway is at `http://localhost:4000`.

## Push to GitHub

```powershell
git init
git add .
git commit -m "Student management system: microservices, Docker, Kubernetes"
git branch -M main
git remote add origin https://github.com/<your-username>/student-management-system.git
git push -u origin main
```

`.gitignore` keeps `node_modules`, `.env` and `k8s/secret.yaml` out of the repo.
