# LetterGram 🎬

LetterGram é uma aplicação desenvolvida para compartilhar análises (reviews) de filmes do **Letterboxd** diretamente no seu Instagram Stories, com um design de alta qualidade, flexível e totalmente personalizável.

## 🏗️ Arquitetura do Projeto

O projeto é dividido em dias grandes frentes nesta estrutura atual:

### 1. Frontend (Web Prototype)
A pasta `frontend` contém o design focado puramente em prototipagem da interface em HTML, Tailwind CSS e Vanilla JS. Serve para validar o luxo, as cores, tamanhos e formato da interação que, em um momento futuro, farão parte do **React Native (App Android)**.
* **Componentes:**
  * Início Cinemático (Página raiz que recebe o link).
  * Editor de Layout de Stories (Onde você pode mudar plano de fundo, ocultar/exibir poster, nota, tamanho da fonte e criar seu design customizado de arrastar).

### 2. Backend (Letterboxd Extractor)
A pasta `backend` contém um servidor ágil usando **Python** e o framework **FastAPI**.
Ele ignora os bloqueios diretos de CORS do navegador, indo até a página do Letterboxd (via scraping com `requests` e `BeautifulSoup`), puxa o texto real da review do usuário, o número de estrelas e a capa do filme, e envia para o Frontend preencher o Story visualmente.

## 🚀 Como Executar o Projeto Localmente

Siga o passo a passo para ver a "mágica" completa: o Front-end conversando com o Back-end com dados reais!

### Passo 1: Iniciar o Servidor Python (Backend)
1. Abra o terminal raiz e navegue até a pasta `backend`: `cd backend`
2. Instale as dependências (recomendado usar um ambiente virtual):
   ```bash
   pip install -r requirements.txt
   ```
3. Inicie o servidor:
   ```bash
   python main.py
   # Ou via uvicorn: uvicorn main:app --reload
   ```
O servidor ficará rodando em `http://127.0.0.1:8000`. Cuidado para não fechar essa janela do terminal.

### Passo 2: Rodar os Testes (Opcional)
Para garantir que tudo está funcionando corretamente:
1. Na pasta `backend`, com o ambiente virtual ativo, rode:
   ```bash
   pytest
   ```

### Passo 3: Acessar a Interface Gráfica (Frontend)
1. Vá até a pasta diretório `frontend`.
2. Dê um duplo-clique para abrir o arquivo `index.html` em qualquer navegador (Chrome, Edge, Safari, etc).
3. Isso vai te levar pela jornada: clique no botão da **Tela Inicial Cinemática**, e cole o link de uma url real do Letterboxd de uma Review, como por exemplo: `https://boxd.it/cVN5Np` (A review do *Train Dreams (2025)*) e clique em "Gerar Post".
4. O app buscará na API recém levantada do python que irá retornar estrelas, capa extraída e o texto exato para a Tela Sequencial, o **Editor de Story**.

## 🔮 Futuro: React Native
Assim que os layouts HTML/Web e o robô de extração do Python estiverem lapidados e finalizados, o arquivo Frontend inteiro poderá migrar de HTML para **Componentes Nativos (`<View>`, `<Text>`) do React Native usando Expo** para construirmos o App oficial na Play Store para os dispositivos Android.
