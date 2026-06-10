
<img src="frontend/assets/logo-icon.png" height="60" alt="LetterGram Logo" />

# LetterGram
**Transforme suas reviews do Letterboxd em Stories para o Instagram.**

## O que é

LetterGram é uma ferramenta que combina o universo do cinema com o compartilhamento visual das redes sociais. Cole o link de qualquer review do Letterboxd (ex: `letterboxd.com/seuuser/film/nome-do-filme/`), e o app gera automaticamente um Story pronto para o Instagram — com pôster, nota, trecho da review e identidade visual personalizada.

## Tecnologias

| Camada             | Stack                                         |
| ------------------ | --------------------------------------------- |
| **Mobile**         | Expo 54 · React Native · TypeScript · Inter   |
| **Backend (API)**  | Python · FastAPI · BeautifulSoup4 (scraping)   |
| **Storage**        | AsyncStorage (cache local no device)           |
| **Exportação**     | `react-native-view-shot` (captura em PNG)      |
| **Deploy (API)**   | Vercel Serverless (Python)                     |

## Funcionalidades

- 🎬 Extração automática de review, pôster, estrelas e perfil do Letterboxd
- 🎨 Editor visual com cores de destaque personalizáveis
- 📲 Exportação do Story como imagem PNG de alta resolução
- 📊 Recap anual com estatísticas, gráfico mensal e top filmes
- 📥 Importação de CSV exportado do Letterboxd
- ✨ Interface mobile-first com design premium dark mode

## Como rodar

### Pré-requisitos
- Python 3.10+
- Node.js 18+
- Expo Go no celular (ou emulador Android)

### Backend (API)
```bash
make setup     # Cria venv e instala deps
make backend   # Inicia API em http://localhost:8000
make web       # Expo no browser
```

### Mobile
```bash
make install   # npm install
make app       # Expo Go (QR code)
```

### Testes
```bash
make test      # pytest no backend
```

> Use `make help` para ver todos os comandos disponíveis.

## Estrutura do projeto

```
LetterGram/
├── backend/              # API FastAPI (scraping do Letterboxd)
│   ├── api/routes.py     # Rotas REST
│   ├── services/         # Lógica de scraping
│   ├── models/schemas.py # Schemas Pydantic
│   └── tests/            # Testes pytest
├── mobile/               # App Expo/React Native
│   ├── app/              # Telas (expo-router)
│   ├── components/       # Componentes reutilizáveis
│   ├── services/         # API client + storage
│   └── constants/        # Design system (tema)
├── Makefile              # Comandos de desenvolvimento
└── vercel.json           # Deploy da API
```

## Status

> ⚠️ **BETA** — Projeto em desenvolvimento ativo. Funcionalidades podem mudar.
