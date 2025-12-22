#!/bin/bash

# Este script compila a aplicação e a instala como um comando de terminal.

# Para o script se um comando falhar
set -e

echo "PASSO 1: Compilando a aplicação Notes-s..."
npm run build

# Define o caminho para o executável da aplicação.
# Este caminho pode variar dependendo do seu sistema operacional e arquitetura.
# Este script assume macOS com Apple Silicon (arm64).
APP_EXECUTABLE="$(pwd)/dist/mac-arm64/Notes-s.app/Contents/MacOS/Notes-s"

# Verifica se o arquivo executável foi criado com sucesso.
if [ ! -f "$APP_EXECUTABLE" ]; then
    echo "Erro: Build falhou ou o executável não foi encontrado em $APP_EXECUTABLE"
    exit 1
fi

echo "Build concluído com sucesso!"
echo ""
echo "PASSO 2: Criando o script de atalho para o terminal..."

# Cria um script temporário que será o comando 'notes-s'
cat > notes-s-launcher << EOL
#!/bin/bash
# Lança a aplicação Notes-s com os argumentos fornecidos.
open -a "$APP_EXECUTABLE" --args "\$@"
EOL

echo "Atalho criado."
echo ""
echo "PASSO 3: Instalando o comando 'notes-s' em /usr/local/bin/..."

# Dá permissão de execução ao script
chmod +x notes-s-launcher

# Move o script para uma pasta no PATH do sistema.
# O comando 'sudo' pedirá sua senha de administrador.
sudo mv notes-s-launcher /usr/local/bin/notes-s

echo ""
echo "✅ Instalação concluída com sucesso!"
echo ""
echo "Para usar, abra um NOVO terminal e execute:"
echo "  notes-s"
echo "ou"
echo "  notes-s /caminho/para/seu/arquivo.md"
