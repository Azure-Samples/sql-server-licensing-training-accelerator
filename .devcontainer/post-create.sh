#!/bin/bash

curl -sSL https://install.python-poetry.org | python3 -
export PATH="/home/codespace/.local/bin:$PATH"
echo 'export PATH="/home/codespace/.local/bin:$PATH"' >> ~/.bashrc

cd backend
poetry install
cd ..

cd frontend
npm install
cd ..

if [ ! -f backend/.env ]; then
    echo "Creating backend .env file..."
    touch backend/.env
fi

if [ ! -f frontend/.env ]; then
    echo "Creating frontend .env file..."
    cp frontend/.env.example frontend/.env
fi

echo "🚀 Development environment setup complete!"
echo "📚 SQL Server Licensing Training Accelerator by Laura Robinson"
echo ""
echo "To start development:"
echo "  Backend:  cd backend && poetry run fastapi dev app/main.py"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Ports:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
