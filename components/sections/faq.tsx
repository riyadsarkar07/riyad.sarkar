"use client";

import { faqs } from "@/data/content";
import { Reveal } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** FAQ — animated accordion. */
export function Faq() {
  return (
    <section id="faq" className="section relative overflow-hidden">
      <div className="container">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, Answered"
          description="The answers clients ask most before we begin. Anything else? Reach out directly."
        />

        <Reveal className="mx-auto mt-6 max-w-3xl sm:mt-8">
          <div className="glass gradient-border rounded-3xl px-6 sm:px-8">
            <Accordion type="single" collapsible defaultValue={faqs[0].id}>
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
