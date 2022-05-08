#Team Registration and Schedule - Node.js

### SK
## Inštalácia

1. Naklonuj si projekt
   ```sh
   git clone repository_url
   ```
2. Stiahni a nainštaluj systém [Node.js](https://nodejs.org/en/download/)   

3. Stiahni dependencie zo súboru [package.json](./package.json). Pre stiahnutie použi možnosti IDE alebo NPM použitím príkazu `npm install` v koreňovom priečinku projektu.

4. Spusti databázový systém [PostgreSQL](https://www.postgresql.org/download/) s vytvorenou databázou.

5. Zadefinuj adresu pripojenia k databáze do `process.env.DATABASE_URL`

5. Zadefinuj port aplikácie do `process.env.PORT` 

6. Spusti aplikáciu príkazom `node index.js`

7. Aplikácia po úspešnom pripojení a vytvorení tabuliek beží na porte `process.env.PORT` alebo `3000` pri nedefinovanej hodnote.

## Pridanie prvého administrátora 
1. Spusti aplikáciu
2. Otvor relatívnu adresu `/admin/register`
3. Vyplň formulár s požadovanými údajmi a odošli.
4. Po úspešnom odoslaní a spracovaní je vytvorený prvý administrátor a prístup na adresu `/admin/register` je zakázaný.


Tento repozitár je súčasťou bakalárskej práce **Návrh a realizácia aplikácie pre rozpis súťaže
v športovom odvetví**

Martin Fridrik pod vedením Ing. Ján Cigánek, PhD, Slovenská technická univerzita
v Bratislave, Fakulta elektrotechniky a informatiky 2021/2022
