import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Zap, Mail, ListOrdered } from "lucide-react";

const FRAMEWORKS = [
  {
    id: "aida",
    name: "AIDA",
    tagline: "Il framework classico. Funziona sempre.",
    whenToUse: ["Lancio prodotto", "Prima email di una promozione", "Newsletter con un focus chiaro"],
    structure: ["Attention — cattura l'attenzione con un hook forte", "Interest — costruisci interesse parlando del problema o del beneficio", "Desire — crea desiderio con prove, dettagli, scarsità", "Action — chiudi con una CTA chiara e diretta"],
    example: {
      subject: "La manopola che non perdi più in mare ⛵",
      body: `[A] Quante volte hai cercato la winch handle e non l'hai trovata?\n\n[I] Flipper™ nasce da un problema reale: le manopole tradizionali cadono, si perdono, occupano spazio. Flipper si piega, si aggancia, resta dove l'hai messa.\n\n[D] ~~€249,00~~ €195,00. Prima manopola pieghevole al mondo. Oltre 1.200 velisti la usano ogni giorno.\n\n[A] → Ordina ora`
    },
    tip: "Metti l'Attention nel subject line, non nel body. Il body parte già dall'Interest."
  },
  {
    id: "pas",
    name: "PAS",
    tagline: "Il più potente per email emotive.",
    whenToUse: ["Prodotti che risolvono un problema specifico", "Email a freddo", "Riattivazione clienti inattivi"],
    structure: ["Problem — nomina il problema con precisione chirurgica", "Agitate — amplifica il disagio, fai sentire il peso del problema", "Solution — presenta il prodotto come l'unica via d'uscita logica"],
    example: {
      subject: "Il tuo lazy bag si sta rovinando. Ecco perché.",
      body: `[P] Il sole, il sale, i cicli termici: il tuo lazy bag invecchia ogni giorno in coperta.\n\n[A] Ogni volta che ammaini, stai stressando una cucitura già indebolita. Un giorno cede — di solito nel momento sbagliato, nel porto sbagliato.\n\n[S] Spira™ si avvolge in 10 secondi e protegge ogni punto di contatto. Niente attrezzi. Niente scuse.\n→ Scopri Spira™`
    },
    tip: "La fase Agitate deve far sentire il problema, non solo descriverlo. Usa immagini mentali concrete."
  },
  {
    id: "soap",
    name: "SOAP Opera Sequence",
    tagline: "Non è una mail — è una serie. Usala per sequenze di 4–7 email.",
    whenToUse: ["Sequenza di benvenuto nuovi iscritti", "Lancio prodotto importante", "Storytelling del brand"],
    structure: [
      "Email 1 — Setting: presenta il contesto e crea curiosità per la prossima email",
      "Email 2 — Drama: svela un conflitto o backstory che coinvolge il lettore",
      "Email 3 — Backstory: approfondisce l'origine del problema/prodotto",
      "Email 4 — Wall: il momento più buio prima della svolta",
      "Email 5 — Epiphany: la svolta, l'insight, la soluzione trovata",
      "Email 6 — Solution: presenta il prodotto come risultato naturale della storia"
    ],
    example: {
      subject: "Email 1: La cosa che mi ha fatto rifare tutto da capo",
      body: `La prima volta che ho perso una winch handle era il 2019, al largo di Capraia.\n\nNon era solo un attrezzo. Era ore di navigazione in meno, una manovra andata male, un equipaggio che guardava.\n\nDa quel momento ho iniziato a chiedermi se il problema fosse io — o il prodotto.\n\nDomani ti racconto cosa ho scoperto.`
    },
    tip: "Ogni email deve finire con un 'hook' che fa venire voglia di leggere la prossima. Il cliffhanger è il motore della sequenza."
  },
  {
    id: "bab",
    name: "Before-After-Bridge",
    tagline: "Mostra la trasformazione. Semplice, efficace.",
    whenToUse: ["Prodotti con beneficio visibile e immediato", "Email di confronto", "Testimonial-driven campaigns"],
    structure: ["Before — descrivi la situazione attuale (con il problema)", "After — dipingi il mondo ideale (senza il problema)", "Bridge — il tuo prodotto è il ponte tra i due mondi"],
    example: {
      subject: "Prima: cerchi la manopola. Dopo: è già in mano.",
      body: `Prima: la winch handle è da qualche parte in pozzetto. Forse sotto la cerata. Forse no.\n\nDopo: Flipper™ è agganciata dove l'hai lasciata. La prendi, la apri, la usi. In 3 secondi.\n\nIl bridge? Una cerniera brevettata e 4 anni di test in acqua salata.\n→ €195,00 — Ordina ora`
    },
    tip: "Il Before deve far sentire il lettore capito, non giudicato. Il After deve essere concreto, non iperbolico."
  },
  {
    id: "4ps",
    name: "4 Ps",
    tagline: "Struttura da direct response classico. Ottima per promo.",
    whenToUse: ["Email promozionali con scadenza", "Campagne con offerta chiara", "Black Friday, weekend deals"],
    structure: ["Promise — fai una promessa forte e specifica nell'apertura", "Picture — dipingi un'immagine vivida del beneficio", "Proof — dimostra con dati, recensioni, numeri", "Push — spingi all'azione con urgenza reale"],
    example: {
      subject: "Spedizione gratuita. Solo questo weekend. ⛵",
      body: `[Promise] Da venerdì a lunedì: zero costi di spedizione su tutto il catalogo.\n\n[Picture] Immagina il tuo pozzetto con la winch handle che non perdi più, lo snatch block che non gratta, la copertura che protegge senza attrezzi.\n\n[Proof] Oltre 3.400 ordini spediti. 4.8/5 su Trustpilot.\n\n[Push] L'offerta finisce lunedì notte. Nessun codice, nessun minimo.\n→ SHOP ORA`
    },
    tip: "La Promise deve essere misurabile. Non 'risparmia' ma 'spedizione gratuita'. Non 'qualità' ma '4.8/5 su 800 recensioni'."
  },
  {
    id: "storybrand",
    name: "StoryBrand",
    tagline: "Il cliente è l'eroe. Tu sei la guida. Non confonderli.",
    whenToUse: ["Email di benvenuto", "About / brand storytelling", "Onboarding nuovi clienti"],
    structure: [
      "Character — identifica il tuo cliente e il suo obiettivo",
      "Problem — nomina il problema esterno, interno ed esistenziale",
      "Guide — posiziona il brand come guida (non eroe)",
      "Plan — dai un piano semplice in 2–3 passi",
      "Call to Action — chiara e diretta",
      "Success — mostra come sarà la vita dopo",
      "Failure — accenna al costo del non agire (senza drammatizzare)"
    ],
    example: {
      subject: "Benvenuto in easysea®. Sei nel posto giusto.",
      body: `Sei un velista che vuole equipaggiamento affidabile, senza compromessi.\n\nIl problema: il mercato è pieno di prodotti belli in foto e deludenti in acqua.\n\nNoi siamo velisti anche noi. Progettiamo solo quello che useremmo — e usiamo quello che progettiamo.\n\nEcco come funziona:\n1. Scegli quello che ti serve\n2. Ordini e arriva in 48h\n3. Lo usi. Se non funziona, te lo sostituiamo.\n\n→ Inizia a esplorare il catalogo`
    },
    tip: "Il brand non deve mai sembrare più importante del cliente. Ogni frase dovrebbe rispondere: 'E quindi cosa guadagna il lettore?'"
  },
  {
    id: "fbp",
    name: "Feature-Benefit-Proof",
    tagline: "Per prodotti tecnici. La struttura più onesta.",
    whenToUse: ["Email di lancio prodotto tecnico", "Comparativi", "Clienti già caldi che vogliono dettagli"],
    structure: ["Feature — descrivi la caratteristica tecnica con precisione", "Benefit — spiega cosa cambia concretamente per il cliente", "Proof — dimostra con un dato, una recensione, un test"],
    example: {
      subject: "Cosa rende Olli™ Block diverso da qualsiasi snatch block.",
      body: `**Cassa in tecnopolimero aerospaziale** (Feature)\nNon si gratta con scocca, non arrugginisce, pesa il 40% in meno dell'acciaio.\n(Benefit) Manovre più fluide, coperta protetta, meno fatica sull'armo.\n(Proof) Testato a 3x il carico di rottura dichiarato. Usato da regate offshore a crociere atlantiche.\n\n→ Da €109,00 — Scopri Olli™ Block`
    },
    tip: "Ogni feature senza benefit è solo un numero. Ogni benefit senza proof è solo una promessa. Usa la triade completa."
  },
  {
    id: "broadcast",
    name: "Plain Broadcast",
    tagline: "Nessun framework. Solo comunicazione diretta.",
    whenToUse: ["Aggiornamenti operativi", "Annunci rapidi", "Newsletter leggere", "Follow-up post-acquisto"],
    structure: ["Apertura diretta — vai subito al punto", "Corpo — dai le informazioni necessarie, niente di più", "Link — uno, chiaro, contestuale"],
    example: {
      subject: "Flipper™ è di nuovo disponibile.",
      body: `Flipper™ Foldable Winch Handle è tornata in stock.\n\nTutte le taglie disponibili. Spedizione in 48h.\n\n→ Ordina ora`
    },
    tip: "La semplicità è una scelta stilistica, non una mancanza di effort. Una broadcast mal scritta sembra pigrizia; una ben scritta sembra autorevolezza."
  }
];

const BEST_PRACTICES_SINGLE = [
  { title: "Subject line: massimo 45 caratteri", body: "Oltre i 45 caratteri viene tagliato su mobile. Il punto più importante è nei primi 30. Testa sempre l'anteprima su mobile prima di inviare." },
  { title: "Preview text: completa il subject, non lo ripete", body: "Subject e preview devono lavorare insieme come prima e seconda riga di un annuncio. Se il subject crea curiosità, il preview aggiunge urgenza o contesto." },
  { title: "Una sola idea per email", body: "Ogni email deve avere un solo argomento, una sola CTA principale. Se hai due cose da dire, manda due email. La chiarezza batte la completezza." },
  { title: "CTA sopra la piega", body: "La call to action principale deve essere visibile senza scrollare. Metti una CTA entro le prime 3 sezioni." },
  { title: "Paragrafi corti, una frase per concetto", body: "Max 3 righe per paragrafo. Una frase per pensiero. Il ritmo visivo è parte del tono." },
  { title: "Personalizzazione: usa il nome, ma non abusarne", body: "{{ person.first_name }} nel subject o nell'apertura aumenta l'open rate. Usarlo più di 2 volte per email inizia a sembrare manipolativo." },
  { title: "Il timing conta quanto il copy", body: "Martedì–giovedì, ore 8–10 o 18–20 per B2C lifestyle. Per velisti: venerdì pomeriggio e domenica sera hanno performance superiori alla media." },
  { title: "Testa sempre almeno 2 subject line (A/B)", body: "Anche piccole variazioni (emoji sì/no, domanda vs. affermazione) producono differenze significative. Klaviyo ha A/B testing nativo — usalo." },
];

const SEQUENCES = [
  {
    name: "Welcome Sequence (5 email)",
    description: "Per nuovi iscritti alla newsletter. Obiettivo: trasformare un lead freddo in cliente convinto.",
    framework: "SOAP Opera Sequence",
    emails: [
      { day: "Immediata", subject: "Benvenuto. Ecco chi siamo davvero.", goal: "Presentare il brand con una storia. NON vendere." },
      { day: "Giorno 2", subject: "Il problema che nessun produttore voleva risolvere", goal: "Racconta il problema che ha dato origine al brand." },
      { day: "Giorno 4", subject: "Come siamo arrivati a Flipper™", goal: "Il momento di svolta. Introduci il prodotto." },
      { day: "Giorno 7", subject: "Quello che dicono i velisti che la usano ogni giorno", goal: "Social proof. Recensioni reali. Prima CTA diretta." },
      { day: "Giorno 10", subject: "Per te: 10% sul primo ordine.", goal: "Offerta di conversione con scadenza." },
    ],
  },
  {
    name: "Lancio Prodotto (4 email)",
    description: "Per introdurre un prodotto nuovo o di ritorno.",
    framework: "AIDA + 4 Ps",
    emails: [
      { day: "7 giorni prima", subject: "Sta arrivando qualcosa.", goal: "Teaser. Crea curiosità senza rivelare." },
      { day: "3 giorni prima", subject: "Ti presento [Nome Prodotto]", goal: "Reveal completo. Features, benefits, storia." },
      { day: "Giorno del lancio", subject: "È live. [Nome Prodotto] è tuo.", goal: "Lancio ufficiale. CTA principale." },
      { day: "3 giorni dopo", subject: "Ultime unità / Quello che non ti avevo detto", goal: "Email di chiusura. Urgenza finale." },
    ],
  },
  {
    name: "Promo Weekend (3 email)",
    description: "Per promozioni a tempo (free shipping, sconto, bundle).",
    framework: "4 Ps",
    emails: [
      { day: "Venerdì mattina", subject: "Spedizione gratuita. Solo questo weekend ⛵", goal: "Annuncio dell'offerta. Massima chiarezza." },
      { day: "Sabato mattina", subject: "[Nome], hai visto i prodotti in evidenza?", goal: "Reminder con angolo diverso." },
      { day: "Domenica sera", subject: "Ultime ore. Scade a mezzanotte.", goal: "Last call. Breve, diretto, un solo CTA." },
    ],
  },
  {
    name: "Post-Acquisto (3 email)",
    description: "Dopo ogni ordine. Rafforza la decisione, riduce i resi.",
    framework: "StoryBrand + Plain Broadcast",
    emails: [
      { day: "Immediata", subject: "Il tuo ordine è confermato. Eccolo.", goal: "Conferma + messaggio caldo." },
      { day: "Giorno della consegna", subject: "È arrivato. Ecco come usarlo al meglio.", goal: "Tutorial breve o tip d'uso." },
      { day: "14 giorni dopo", subject: "Come sta andando?", goal: "Richiesta di recensione con tono personale." },
    ],
  },
  {
    name: "Riattivazione Dormienti (3 email)",
    description: "Per chi non compra o non apre da 90+ giorni.",
    framework: "PAS",
    emails: [
      { day: "Email 1", subject: "Sei ancora lì?", goal: "Email corta e diretta. Riconosce il silenzio." },
      { day: "Email 2 (4 giorni dopo)", subject: "Un'ultima cosa prima di salutarci", goal: "Offerta di riattivazione concreta." },
      { day: "Email 3 (7 giorni dopo)", subject: "Ti rimuoviamo dalla lista — a meno che...", goal: "Email di rottura. Chi clicca 'resto' è caldo." },
    ],
  },
];

export default function Guide() {
  const [activeFramework, setActiveFramework] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guida ai Framework & Best Practice</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tutto quello che devi sapere per scegliere il framework giusto e scrivere email che convertono.
        </p>
      </div>

      <Tabs defaultValue="frameworks">
        <TabsList className="mb-6">
          <TabsTrigger value="frameworks">
            <BookOpen className="mr-2 h-4 w-4" />
            Framework
          </TabsTrigger>
          <TabsTrigger value="single">
            <Mail className="mr-2 h-4 w-4" />
            Email singola
          </TabsTrigger>
          <TabsTrigger value="sequences">
            <ListOrdered className="mr-2 h-4 w-4" />
            Sequenze
          </TabsTrigger>
        </TabsList>

        <TabsContent value="frameworks" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Un framework di scrittura è una struttura narrativa collaudata che guida il lettore
            dalla prima frase alla CTA. Scegli in base all'obiettivo della mail e al calore del pubblico.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {FRAMEWORKS.map((fw) => (
              <Card
                key={fw.id}
                className={`cursor-pointer transition-all ${activeFramework === fw.id ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                onClick={() => setActiveFramework(activeFramework === fw.id ? null : fw.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">{fw.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">{fw.whenToUse[0]}</Badge>
                  </div>
                  <CardDescription>{fw.tagline}</CardDescription>
                </CardHeader>
                {activeFramework === fw.id && (
                  <CardContent className="space-y-5 pt-0">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Struttura</p>
                      <ol className="space-y-1">
                        {fw.structure.map((step, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-muted-foreground font-mono shrink-0">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Usalo per</p>
                      <div className="flex flex-wrap gap-2">
                        {fw.whenToUse.map((u) => (
                          <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Esempio easysea®</p>
                      <div className="bg-muted rounded-md p-3 space-y-2">
                        <p className="text-xs font-medium">Subject: {fw.example.subject}</p>
                        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{fw.example.body}</pre>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800"><strong>Pro tip:</strong> {fw.tip}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="single" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Regole che si applicano a qualsiasi tipo di email, indipendentemente dal framework scelto.
          </p>
          <Accordion type="multiple" className="space-y-2">
            {BEST_PRACTICES_SINGLE.map((bp, i) => (
              <AccordionItem key={i} value={`bp-${i}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono text-xs w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    {bp.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3">
                  {bp.body}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="sequences" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Una sequenza email è una serie di messaggi coordinati che guidano il lettore attraverso un percorso nel tempo.
          </p>
          {SEQUENCES.map((seq) => (
            <Card key={seq.name}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{seq.name}</CardTitle>
                    <CardDescription className="mt-1">{seq.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">{seq.framework}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {seq.emails.map((email, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        {i < seq.emails.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs font-normal">{email.day}</Badge>
                          <p className="text-sm font-medium truncate">{email.subject}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{email.goal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
