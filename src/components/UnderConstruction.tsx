import { Construction } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export default function UnderConstruction({ title, description }: Props) {
  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
        <Construction className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mt-5 font-serif text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-construction-bar rounded-full bg-primary" />
      </div>
    </div>
  );
}
