import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AiAnswerBlock - Answer Engine Optimization (AEO) & Generative Engine Optimization (GEO) Component.
 *
 * Provides direct, citation-grade, machine-parseable answers in visible semantic HTML.
 * Questions are formatted as <h2> with concise, authoritative 1-3 sentence direct answers,
 * followed by structured key facts and internal links for crawler grounding.
 */
export default function AiAnswerBlock({
  question,
  answer,
  facts = [],
  relatedLinks = [],
  className = ''
}) {
  if (!question || !answer) return null;

  return (
    <section className={`ai-answer-block card ${className}`} aria-label="Quick Answer">
      <div className="ai-answer-header">
        <span className="ai-answer-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          Direct Fact Overview
        </span>
        <h2 className="ai-answer-question">{question}</h2>
      </div>

      <div className="ai-answer-direct-text">
        <p>{answer}</p>
      </div>

      {facts && facts.length > 0 && (
        <div className="ai-answer-facts">
          <table className="ai-facts-table" aria-label="Key Facts">
            <tbody>
              {facts.map((fact, index) => (
                <tr key={index}>
                  <th scope="row" className="ai-fact-label">{fact.label}</th>
                  <td className="ai-fact-value">{fact.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {relatedLinks && relatedLinks.length > 0 && (
        <div className="ai-answer-links">
          <span className="ai-links-heading">Learn more:</span>
          <div className="ai-links-list">
            {relatedLinks.map((link, index) => (
              <Link key={index} to={link.to} className="ai-related-link">
                {link.label} →
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
