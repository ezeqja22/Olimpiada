import React from "react";
import klevisaPhoto from "../assets/klevisa.jpeg";
import gangoPhoto from "../assets/gango1.jpeg";
import "./AboutFounders.css";

const founders = [
  {
    name: "Klevisa Zeqja",
    role: "Co-founder",
    image: klevisaPhoto,
    description: "Co-founder and developer of the Olimpiada.al platform.",
    highlights: [
      "European Girls’ Mathematical Olympiad 2025 (EGMO) — Honorable Mention",
      "Jane Street WiSE 2026 Participant",
      "Ranked among the top 5 students in the Albanian National Mathematics Olympiad",
    ],
  },
  {
    name: "Enio Zeqja",
    role: "Co-founder",
    image: gangoPhoto,
    description: "Co-founder and developer of the Olimpiada.al platform.",
    highlights: [
      "Full-stack platform development",
      "BSc graduate in Software Engineering",
      "Educational technology and olympiad preparation",
      "Co-creator of the Olimpiada.al system architecture",
    ],
  },
];

export default function AboutFounders() {
  return (
    <section
      className="about-founders-section"
      aria-labelledby="about-founders-title"
    >
      <div className="about-founders-shell">
        <div className="about-founders-header">
          <span className="about-eyebrow">About Us</span>
          <h2 id="about-founders-title">
            Built by students, for ambitious learners
          </h2>
          <p>
            Meet the team behind Olimpiada.al. Learn from those who have done
            it.
          </p>
        </div>

        <div className="founders-grid">
          {founders.map((founder) => (
            <article className="founder-card" key={founder.name}>
              <div className="founder-image-wrap">
                <img
                  src={founder.image}
                  alt={`${founder.name}, ${founder.role}`}
                  className="founder-image"
                  loading="lazy"
                />
              </div>

              <div className="founder-content">
                <div className="founder-heading-row">
                  <div>
                    <h3>{founder.name}</h3>
                    <p className="founder-role">{founder.role}</p>
                  </div>
                </div>

                <p className="founder-description">{founder.description}</p>

                <ul className="founder-highlights">
                  {founder.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
