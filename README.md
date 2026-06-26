
## Overview
1. simulator/
    - basic UI (no react, simple vannila JS)
    - the `app.js` does the heavy lifting

2. src/ 
manages backend and 'agentic' flow

3. docker compose
for vector db


## setup
1. create and activate virtual environment and install dependencies
    - `python -m venv .venv`
    - `.venv/Scripts/activate`
    - `pip install -r requirements.txt`
2. start ollama
    - `ollama serve`
3. start backend (inside `src/`)
    - `uvicorn main:app --reload`
4. start docker container 
    - `docker-compose up -d` 

### Requirements
1. python
2. `ollama` with mentioned models (make sure you do `ollama serve`)
3. docker
4. interest in the project (optional)
