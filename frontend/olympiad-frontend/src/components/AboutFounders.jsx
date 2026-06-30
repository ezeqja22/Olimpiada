import React from "react";
import { UserRound } from "lucide-react";
import klevisaPhoto from "../assets/klevisa.jpeg";
import "./AboutFounders.css";

const founders = [
  {
    name: "Klevisa Zeqja",
    role: "Co-founder",
    image: klevisaPhoto,
    description: "Co-founder and lead developer of the Olimpiada.al platform.",
    highlights: [
      "European Girls’ Mathematical Olympiad (EGMO) Honorable Mention",
      "Jane Street WiSE 2026 Participant",
      "Top 5 math students nationally",
    ],
  },
  {
    name: "Enio Zeqja",
    role: "Co-founder",
    placeholder: true,
    description: "Co-founder and developer of the Olimpiada.al platform.",
    highlights: [
      "Full-stack platform development",
      "Educational technology and olympiad preparation",
      "Co-creator of the Olimpiada.al system architecture ",
    ],
  },
];

export default function AboutFounders() {
  return (
    <section className="about-founders-section">
      <div className="about-founders-header">
        <span className="about-eyebrow">About Us</span>
        <h2>Built by students, for ambitious learners</h2>
        <p>
          SciencePioneers was created to make olympiad preparation more
          accessible, structured, and community-driven.
        </p>
      </div>

      <div className="founders-grid">
        {founders.map((founder) => (
          <article className="founder-card" key={founder.name}>
            <div className="founder-image-wrap">
              {founder.placeholder ? (
                <div className="founder-placeholder">
                  <UserRound size={72} strokeWidth={1.6} />
                </div>
              ) : (
                <img
                  src={founder.image}
                  alt={founder.name}
                  className="founder-image"
                />
              )}
            </div>

            <div className="founder-content">
              <h3>{founder.name}</h3>
              <p className="founder-role">{founder.role}</p>

              {founder.description && (
                <p className="founder-description">{founder.description}</p>
              )}

              <ul className="founder-highlights">
                {founder.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
