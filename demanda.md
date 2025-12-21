eu como usuário quero criar e editar arquivos markdown de forma rápida.

## Requisitos Funcionais
* Sistema deve ler e salvar arquivos localmente
* Sistema deve disponibilizar uma interface com apenas o espaço para digtar, sem menus.
* Sistema deve salvar o arquivo atual com o comando command + s
* Sistema deve organizar as formatações em dois grupos, Formatação de Linha e Formatação de trecho
  Formatação de linha são as colocada no início de cada linha, como: #, -/* e >
  Formatação de trecho são as formatação aplicas em um trecho, como **trecho**, `trecho`, ```syntaxy trecho ```
* Sistema deve usar a tecla espaço exibir o texto formatado
* Sistema deve atualizar a tela quando o espaço for apertado quando for o primeiro espaço da linha ou quando estiver "fechando" uma formatação de trecho
* Sistema deve manter o cursor na mesma posição após apertar o espaço
* Sistema deve atualizar a tela quando for o primeiro espaço da linha ou quando for o fechamento de uma formatação de trecho 
* Sistema deve manter a formatação caso o espaço tenha sido apertado em uma linha que já inicia com uma formatação markdown  
* Sistema deve abrir um arquivo markdown com o atalho command + o 
* Sistema deve ter o fundo preto e as letras brancas
* Sistema deve remover a formatação de lista (* ou - ) quando usuário digitar duas vezes enter e manter o cursor na linha após remover a formatação

### Bloco de código
* Sistema deve reconhecer a formatação de codigo usando três apóstrofos seguidos como: ```, quando usuário digitar o último apóstrofo dos três sistema deve pular duas linhas e na ultima linha fechar a formatação com mais três apóstrofos seguidos e forcar o cursor na linha do meio  

```
Fazer algo dessa forma 
```
* Sistema deve manter usuário dentro do mesmo bloco de código quando ele apertar enter

## Requisitos não funcionais
* Aplicação tem o nome de Notes-s
* Aplicação deve se chamada via terminal,  inclusive passando  
* Deve ser escrito usando electron
* Deve ser possível chamar direto do terminal 
