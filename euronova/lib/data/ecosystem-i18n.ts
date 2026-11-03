import type { EcosystemResource } from "./ecosystem";

export const EU_PAN_EUROPEAN_LABELS: Record<string, string> = {
  en: "Pan-European",
  es: "Paneuropeo",
  de: "Paneuropäisch",
  fr: "Paneuropéen",
  it: "Paneuropeo",
  pt: "Pan-Europeu",
  ru: "Панъевропейский",
};

/**
 * Returns the localized country/region name for any ISO 3166-1 alpha-2 code or "EU".
 */
export function getLocalizedCountryName(
  code: string,
  locale: string,
  fallbackName?: string
): string {
  if (!code || code === "all") return "";
  if (code.toUpperCase() === "EU") {
    return EU_PAN_EUROPEAN_LABELS[locale] || EU_PAN_EUROPEAN_LABELS.en;
  }
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    const name = displayNames.of(code.toUpperCase());
    if (name) return name;
  } catch {
    // Graceful fallback if Intl is unsupported
  }
  return fallbackName || code;
}

// Curated overrides for high-profile entities
const CURATED_DESCRIPTIONS: Record<string, Record<string, string>> = {
  "ngo-es-mad-mediterranean-crew": {
    es: "ONG juvenil y cultural española MadMediterranea Crew (Maditerranea) centrada en la conservación medioambiental mediterránea, intercambios interculturales y participación activa de jóvenes en iniciativas Erasmus+.",
    de: "Spanische Jugend- und Kultur-NGO MadMediterranea Crew (Maditerranea) mit Schwerpunkt auf mediterranem Umweltschutz, interkulturellem Austausch und aktiver Jugendbeteiligung an Erasmus+-Initiativen.",
    fr: "ONG de jeunesse et culturelle espagnole MadMediterranea Crew (Maditerranea) axée sur la préservation environnementale en Méditerranée, les échanges interculturels et la participation des jeunes au programme Erasmus+.",
    it: "ONG giovanile e culturale spagnola MadMediterranea Crew (Maditerranea) focalizzata sulla conservazione ambientale mediterranea, scambi interculturali e partecipazione giovanile a Erasmus+.",
    pt: "ONG juvenil e cultural espanhola MadMediterranea Crew (Maditerranea) focada na conservação ambiental mediterrânica, intercâmbios interculturais e participação dos jovens em iniciativas Erasmus+.",
    ru: "Испанская молодежная культурная НКО MadMediterranea Crew (Maditerranea), ориентированная на охрану окружающей среды Средиземноморья, межкультурные обмены и участие молодежи в Erasmus+.",
  },
  "ngo-blooming-horizons": {
    es: "Asociación educativa sin ánimo de lucro que organiza intercambios juveniles internacionales, cursos de formación y talleres de inclusión social en toda Europa en el marco del programa Erasmus+.",
    de: "Gemeinnützige Bildungsorganisation, die internationale Jugendbegegnungen, Trainingskurse und Inklusionsworkshops im Rahmen von Erasmus+ europaweit durchführt.",
    fr: "Association éducative à but non lucratif organisant des échanges de jeunes internationaux, des formations et des ateliers d'inclusion à travers l'Europe avec Erasmus+.",
    it: "Associazione educativa senza scopo di lucro che organizza scambi giovanili internazionali, corsi di formazione e workshop di inclusione in tutta Europa nell'ambito di Erasmus+.",
    pt: "Associação educativa sem fins lucrativos que promove intercâmbios internacionais de jovens, cursos de formação e oficinas de inclusão em toda a Europa pelo Erasmus+.",
    ru: "Некоммерческая образовательная ассоциация, организующая международные молодежные обмены, тренинги и инклюзивные воркшопы по всей Европе в рамках Erasmus+.",
  },
  "eyp-official": {
    es: "Portal oficial de la Unión Europea que ofrece orientación exhaustiva sobre oportunidades de voluntariado, empleo, prácticas, iniciativas de participación democrática y viajes por toda Europa.",
    de: "Offizielles Portal der Europäischen Union mit umfassenden Informationen zu Freiwilligendiensten, Praktika, demokratischer Teilhabe und Reisen in ganz Europa.",
    fr: "Portail officiel de l'Union européenne offrant des informations complètes sur le volontariat, l'emploi, les stages, la participation citoyenne et les voyages en Europe.",
    it: "Portale ufficiale dell'Unione Europea con guide complete su volontariato, lavoro, tirocini, partecipazione democratica e viaggi in tutta Europa.",
    pt: "Portal oficial da União Europeia com orientação abrangente sobre voluntariado, emprego, estágios, participação democrática e viagens por toda a Europa.",
    ru: "Официальный портал Европейского союза с подробными рекомендациями по волонтерству, трудоустройству, стажировкам и поездкам по всей Европе.",
  },
  "salto-youth": {
    es: "Red paneuropea de centros de recursos que brinda herramientas pedagógicas de educación no formal, formación avanzada y plataformas de búsqueda de socios para organizaciones Erasmus+.",
    de: "Paneuropäisches Netzwerk von Ressourcenzentren für nicht-formale Bildungsmethoden, Trainerausbildung und Partnersuche für Erasmus+-Organisationen.",
    fr: "Réseau paneuropéen de centres de ressources offrant des outils d'éducation non formelle, des formations avancées et des plateformes de recherche de partenaires pour Erasmus+.",
    it: "Rete paneuropea di centri risorse che fornisce strumenti pedagogici non formali, formazione per operatori giovanili e ricerca partner Erasmus+.",
    pt: "Rede transeuropeia de centros de recursos que fornece ferramentas de educação não-formal, formação avançada e plataformas de parcerias para o Erasmus+.",
    ru: "Общеевропейская сеть ресурсных центров, предоставляющая инструменты неформального образования, тренинги и поиск партнеров для Erasmus+.",
  },
  "erasmus-plus-official": {
    es: "Portal principal de la Comisión Europea con detalles sobre oportunidades de financiación, convocatorias y directrices del programa Erasmus+ para educación, formación, juventud y deporte.",
    de: "Hauptportal der Europäischen Kommission mit Finanzierungsmöglichkeiten, Leitlinien und Antragsfristen des Erasmus+-Programms für Bildung, Jugend und Sport.",
    fr: "Portail principal de la Commission européenne détaillant les financements, appels à projets et lignes directrices du programme Erasmus+ pour la jeunesse et le sport.",
    it: "Portale principale della Commissione Europea con bandi, finanziamenti e linee guida del programma Erasmus+ per istruzione, gioventù e sport.",
    pt: "Portal principal da Comissão Europeia com detalhes de financiamento, candidaturas e diretrizes do programa Erasmus+ para educação, juventude e desporto.",
    ru: "Главный портал Европейской комиссии с подробной информацией о финансировании, грантах и правилах программы Erasmus+ для молодежи и образования.",
  },
};

// Generic multilingual patterns based on category and tags
function generateDynamicDescription(resource: EcosystemResource, locale: string): string {
  const countryName = getLocalizedCountryName(resource.countryCode, locale, resource.countryName);

  if (resource.category === "official") {
    if (resource.id.startsWith("eurodesk-")) {
      switch (locale) {
        case "es":
          return `Centro nacional oficial de información juvenil Eurodesk que ofrece asesoramiento experto sobre becas Erasmus+, voluntariado del Cuerpo Europeo de Solidaridad y movilidad en ${countryName}.`;
        case "de":
          return `Offizielles nationales Eurodesk-Jugendinformationszentrum mit Fachberatung zu Erasmus+-Stipendien, Europäischem Solidaritätskorps und Mobilität in ${countryName}.`;
        case "fr":
          return `Centre national officiel d'information jeunesse Eurodesk fournissant des conseils sur les bourses Erasmus+, le Corps européen de solidarité et la mobilité en ${countryName}.`;
        case "it":
          return `Centro nazionale ufficiale di informazione giovanile Eurodesk per orientamento su borse Erasmus+, Corpo europeo di solidarietà e mobilità in ${countryName}.`;
        case "pt":
          return `Centro nacional oficial de informação juvenil Eurodesk com orientação especializada sobre bolsas Erasmus+, Corpo Europeu de Solidariedade e mobilidade em ${countryName}.`;
        case "ru":
          return `Официальный национальный молодежный инфоцентр Eurodesk, предоставляющий экспертные консультации по грантам Erasmus+, волонтерству ESC и поездкам в ${countryName}.`;
      }
    }

    switch (locale) {
      case "es":
        return `Organismo oficial y portal institucional verificado que gestiona oportunidades europeas de movilidad, educación, subvenciones y voluntariado en ${countryName}.`;
      case "de":
        return `Offizielle Institution und verifiziertes Portal für europäische Mobilitätsangebote, Bildungsprogramme, Zuschüsse und Freiwilligendienste in ${countryName}.`;
      case "fr":
        return `Organisme officiel et portail institutionnel vérifié gérant les opportunités européennes de mobilité, d'éducation, de subventions et de volontariat en ${countryName}.`;
      case "it":
        return `Organismo ufficiale e portale istituzionale verificato che coordina opportunità europee di mobilità, istruzione, sovvenzioni e volontariato in ${countryName}.`;
      case "pt":
        return `Organismo oficial e portal institucional verificado que gere oportunidades europeias de mobilidade, educação, subvenções e voluntariado em ${countryName}.`;
      case "ru":
        return `Официальный институт и проверенный государственный портал, координирующий европейские программы мобильности, образования, грантов и волонтерства в ${countryName}.`;
    }
  }

  if (resource.id.startsWith("esn-")) {
    switch (locale) {
      case "es":
        return `Sección universitaria de Erasmus Student Network dedicada a la acogida, integración sociocultural y apoyo académico para estudiantes de intercambio en ${countryName}.`;
      case "de":
        return `ESN-Hochschulsektion zur sozialen Integration, Begleitung und interkulturellen Unterstützung von internationalen Studierenden in ${countryName}.`;
      case "fr":
        return `Section universitaire du réseau étudiant Erasmus dédiée à l'accueil, l'intégration culturelle et l'accompagnement des étudiants d'échange en ${countryName}.`;
      case "it":
        return `Sezione universitaria di Erasmus Student Network impegnata nell'accoglienza, integrazione sociale e supporto agli studenti in scambio in ${countryName}.`;
      case "pt":
        return `Secção universitária da Erasmus Student Network dedicada ao acolhimento, integração intercultural e apoio a estudantes em intercâmbio em ${countryName}.`;
      case "ru":
        return `Университетское отделение сети Erasmus Student Network, помогающее международным студентам по обмену в адаптации, культуре и учебе в ${countryName}.`;
    }
  }

  if (resource.category === "whatsapp" || resource.category === "telegram") {
    switch (locale) {
      case "es":
        return `Canal comunitario y grupo de mensajería para coordinar información, compartir experiencias y resolver dudas sobre proyectos Erasmus+ y voluntariado europeo en ${countryName}.`;
      case "de":
        return `Community-Kanal und Nachrichtengruppe für Informationsaustausch, Erfahrungen und gegenseitige Unterstützung bei Erasmus+-Projekten in ${countryName}.`;
      case "fr":
        return `Canal communautaire et groupe d'échange pour partager des informations, des conseils pratiques et coordonner des projets Erasmus+ en ${countryName}.`;
      case "it":
        return `Canale comunitario e gruppo di messaggistica per condividere consigli pratici, esperienze e coordinare progetti Erasmus+ in ${countryName}.`;
      case "pt":
        return `Canal comunitário e grupo de mensagens para partilhar experiências, oportunidades e tirar dúvidas sobre projetos Erasmus+ em ${countryName}.`;
      case "ru":
        return `Сообщество и канал для обмена опытом, практическими советами и координации молодежных проектов Erasmus+ в ${countryName}.`;
    }
  }

  // Default NGO template
  switch (locale) {
    case "es":
      return `Organización no gubernamental sin ánimo de lucro dedicada a fomentar la movilidad juvenil, el voluntariado solidario y la participación ciudadana en ${countryName}.`;
    case "de":
      return `Gemeinnützige Nichtregierungsorganisation zur Förderung von Jugendmobilität, solidarischem Engagement und europäischer Bürgerbeteiligung in ${countryName}.`;
    case "fr":
      return `Organisation non gouvernementale à but non lucratif dédiée à la mobilité des jeunes, au volontariat solidaire et à la citoyenneté active en ${countryName}.`;
    case "it":
      return `Organizzazione non governativa senza scopo di lucro impegnata nella promozione della mobilità giovanile, volontariato solidale e cittadinanza europea in ${countryName}.`;
    case "pt":
      return `Organização não governamental sem fins lucrativos dedicada a promover a mobilidade juvenil, o voluntariado solidário e a cidadania ativa em ${countryName}.`;
    case "ru":
      return `Некоммерческая организация, содействующая развитию молодежной мобильности, волонтерских инициатив и активной гражданской позиции в ${countryName}.`;
    default:
      return resource.description;
  }
}

/**
 * Returns the localized description of any resource in the given locale.
 */
export function getLocalizedDescription(resource: EcosystemResource, locale: string): string {
  if (!resource) return "";
  if (locale === "en") {
    return resource.description;
  }
  const curated = CURATED_DESCRIPTIONS[resource.id]?.[locale];
  if (curated) {
    return curated;
  }
  return generateDynamicDescription(resource, locale);
}
