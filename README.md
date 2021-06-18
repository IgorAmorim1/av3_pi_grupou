# APS UNICARIOCA 2021


## GET /grupou/turma/mock

> Gera turma aleatória e retorna id da turma gerada

```
curl http://localhost:5001/aps-unicarioca-2021/us-central1/grupou/turma/mock; echo;
```

## POST /grupou/turma/agrupar/random

> Agrupa a turma de forma aleatória

```
curl -X POST http://localhost:5001/aps-unicarioca-2021/us-central1/grupou/turma/agrupar/random -H "Content-Type: application/json" --data '{"id_turma":"153", "qtd_grupos":"2"}'; echo;
```

## POST /grupou/turma/agrupar/gpask

> Agrupa a turma distribuindo os melhores para cada grupo.

```
curl -X POST http://localhost:5001/aps-unicarioca-2021/us-central1/grupou/turma/agrupar/gpask -H "Content-Type: application/json" --data '{"id_turma":"153", "qtd_grupos":"2"}'; echo;
```

## POST /grupou/turma/analisar

> Agrupa a turma distribuindo os melhores para cada grupo.

```
curl -X POST http://localhost:5001/aps-unicarioca-2021/us-central1/grupou/turma/analisar -H "Content-Type: application/json" --data '{"id_grupos":"153"}'; echo;
```

a3c1a01e-5d11-4f40-b29c-33e1fb224254
b867edb4-5320-466d-96a3-eb1ab6079c1e