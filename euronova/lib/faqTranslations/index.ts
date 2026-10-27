// EuroNova Community Hub FAQ Localized Dictionaries
import es from "./es.json";
import de from "./de.json";
import fr from "./fr.json";
import it from "./it.json";
import pt from "./pt.json";
import ru from "./ru.json";

export interface LocalizedFaqEntry {
  question: string;
  answer: string;
}

export type FaqLocale = "en" | "es" | "de" | "fr" | "it" | "pt" | "ru";

export const FAQ_LOCALIZATIONS: Record<string, Record<string, LocalizedFaqEntry>> = {
  es,
  de,
  fr,
  it,
  pt,
  ru,
};
