# Redaktionellt arbetsflöde för citatbanken

Målet är inte att samla flest citat. Målet är en bred bank där varje spelbart citat antingen är välkänt, roligt, oväntat eller särskilt bra på att lura spelarens partimagkänsla.

## Grundregler

- Tidsperiod: 1994–2026. För Sverigedemokraterna prioriteras 2010 och framåt.
- Ny demokrati ingår inte.
- Partiledare och språkrör prioriteras. Ministrar eller officiella talespersoner används bara när formuleringen är exceptionellt stark.
- Ett citat får vara historiskt, men måste presenteras med årtal, talare och sammanhang efter svaret.
- Citat får inte kapas så att betydelsen förändras. Redaktionell precisering används när en ordlek eller metafor kräver föregående replik.
- Godkända citat måste kunna beläggas ordagrant i en primärkälla eller originalupptagning.

## Granskningssteg

1. `candidate` – en lovande formulering har hittats men kan fortfarande bygga på en sekundär hänvisning.
2. `context-checked` – stycket före och efter har lästs eller lyssnats igenom och innebörden är rätt återgiven.
3. `primary-source-checked` – ordalydelse, talare, datum och källa är kontrollerade i originalet.
4. `approved` – citatet har klarat källgrindarna och når minst 60 av 100 i redaktionell prioritet.
5. `rejected` – felciterat, för kontextberoende, för platt, för likt partiets väntade budskap eller olämpligt för spelets ton.

## Poängmodell

Alla delpoäng sätts 1–5. Slutpoängen beräknas automatiskt till 0–100.

| Faktor | Vikt | Fråga |
| --- | ---: | --- |
| Starkaste av kändisskap/humor | 25 | Är detta ett citat människor känner igen, eller skrattar åt direkt? |
| Den andra av kändisskap/humor | 5 | Får citatet en extra skjuts av att vara både känt och roligt? |
| Överraskning | 20 | Låter formuleringen oväntad från talaren eller partiet? |
| Feldirigering | 15 | Är minst två andra partier rimliga svar? |
| Relevans | 12 | Säger citatet något intressant om sin tid, personen eller politiken? |
| Fristående tydlighet | 10 | Fungerar den korta ordalydelsen innan kontextpanelen visas? |
| Källstyrka | 13 | Är originalet direkt, stabilt och tydligt lokaliserbart? |

Kändisskap och humor behandlas som två alternativa huvudvägar. Ett ikoniskt allvarligt citat och en okänd men briljant punchline kan därför båda hamna högt.

## Hårda godkännandekrav

- Exakt ordalydelse verifierad.
- Talare och roll verifierade.
- Datum verifierat.
- Kontext verifierad.
- Primärkälla eller ordagrann originalupptagning verifierad.
- Tydlig locator till anförande, tidskod eller avsnitt i källan.
- Källstyrka minst 4/5.
- Fristående tydlighet minst 3/5.
- Redaktionell prioritet minst 60/100.
- Citatet är högst 25 ord i spelversionen.

## Urval till rundor

- Banken ska först balanseras per parti; kvalitet avgör inom varje parti.
- En normal runda bör börja med ett välkänt eller tydligt roligt citat.
- Därefter blandas svårighetsgraden: några rättvisa, några luriga och högst ett verkligt obskyrt kort i följd.
- Samma talare bör normalt inte förekomma mer än en gång per runda.
- Historiska citat fördelas över perioden så att spelet inte blir en nutida partiledardebatt med några enstaka arkivkort.

Kör `npm run rank:quotes` för den aktuella prioriteringslistan och återstående granskningsgrindar.

## Filer och kontroller

- `quotes.json` innehåller teknikprovets ursprungliga kärna.
- `quote-batches/*.json` innehåller redaktionellt granskade utökningar. Granskningsskripten läser katalogen automatiskt; aktuella spelbatcher importeras uttryckligen i `app/quotes.ts`.
- `npm run check:quotes` kontrollerar bland annat dubbletter, ordlängd, metadata, poäng, granskningsstatus och hårda godkännandekrav.
- `npm run check:quote-links` gör en separat nätverkskontroll av alla unika källadresser. Den ligger inte i den vanliga byggkontrollen eftersom externa arkiv ibland blockerar automatiska anrop.
- `npm run rank:quotes` visar hela prioriteringslistan och täckningen per parti.
