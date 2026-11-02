# Mergulho do Gustavo

Aventura no fundo do mar para crianças pequenas, **sem propagandas, sem compras e sem coleta de dados**.
A Pipoca mergulha de capacete; a Mimi (no guincho) e a Bolinha (de binóculo) ficam no barquinho. O Gustavo nada pelo mar, estoura **bolhas com letras** para montar a palavra e **fotografa os bichos do mar** para o álbum.

Sem castigo: não tem oxigênio acabando, inimigos nem fim de jogo.

**Jogar:** https://micheltlutz.github.io/mergulho-do-gustavo/

## Instalar no iPad

1. Abra o link acima no **Safari**.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra o jogo pelo ícone **uma vez com internet**. Depois disso ele funciona offline.

Funciona deitado e em pé.

## Como se joga

- **Na tela inicial:** escolher quem mergulha (Pipoca, Mimi ou Bolinha; os outros dois vão no barco), a roupa de mergulho e a palavra. O álbum também abre dali.
- **Nadar:** encostar o dedo na tela. O mergulhador nada até o dedo; soltando, ele boia devagar para cima e fica na superfície ao lado do barco. No teclado, as setas.
- **Letras:** cada letra da palavra está numa bolha brilhante, num cantinho do mar.
  - As primeiras letras ficam mais perto e as últimas mais fundo.
  - Pode pegar em qualquer ordem.
  - Ao encostar, a bolha estoura ("Letra gê! Gê de Gato!"), a letra sobe e o guincho da Mimi leva para o painel.
- **Dicas da Bolinha:** "Gustavo, estou vendo a letra ésse perto do navio afundado!". Uma seta na borda da tela aponta para a letra mais perto quando ela não aparece.
- **Botão da câmera:** o flash ilumina o mar e fotografa os bichos perto (para qualquer lado), com um polaroide e a voz dizendo o nome.
  - **Álbum:** 16 bichos (peixe-palhaço, tartaruga, polvo, água-viva, baleia, tubarão-baleia…).
  - **Roupas:** a cada 4 bichos novos, abre uma roupa de mergulho.
- **Lugares:**
  - recife de corais;
  - floresta de algas;
  - navio afundado (com baú);
  - jardim de conchas;
  - mar aberto (baleia, golfinhos e tubarão-baleia);
  - caverna escura e fundo do mar: escuros, com a luz do capacete e águas-vivas brilhando.
  - Fontes de bolhas no chão dão um empurrão para cima.
- **Festa:** com a palavra completa, o pet volta ao barco, o painel fica dourado, a voz soletra e os três pets dançam.

**Palavras (22, as mesmas da Corrida do Gustavo):** GUSTAVO, MAMÃE, PAPAI, os nomes da família e PATO, COELHO, ESCOLA, PROFESSORA, CACHORRO, PEIXE, IOGURTE e BATATINHA.

## Desenvolvimento

Requer Node 24 ou mais novo.

```sh
npm install
npm run dev -- --host   # abre na rede local (teste no iPad pela Wi-Fi)
npm test                # física, mapa, robô mergulhador (22 palavras) e robô fotógrafo (16 bichos)
npm run build           # versão final em dist/
npm run icons           # gera os ícones PNG a partir de public/icon.svg
```

- `src/game/oceanMap.ts`: o mapa do mar em texto (rocha, areia, navio, cantinhos das letras, fontes de bolhas, enfeites).
- `src/game/ocean.ts`: colisão, lugares com nome (para as dicas), caminhos.
- `src/game/physics.ts`: o nado (empuxo, arrasto, nadar até o dedo, superfície).
- `src/game/dive.ts`: o mergulho sem desenho (letras, guincho, bichos, fotos, dicas, festa).
- `src/game/creatures.ts`: as 16 espécies.
- `src/render/`: o desenho em canvas (mar em camadas, rochas, algas, bichos, barco, escuridão) e os desenhos em SVG.
- `src/ui/`: telas (início, mergulho, álbum).

Cada push na branch `main` roda os testes e publica no GitHub Pages.
