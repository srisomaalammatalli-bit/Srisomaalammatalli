import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Semantic, accessible Breadcrumb navigation component.
 * Supports BreadcrumbList microdata for crawlers and assistive technology.
 */
export default function Breadcrumb({ items = [] }) {
  if (!items || items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb-nav">
      <div className="container">
        <ol className="breadcrumb-list" itemScope itemType="https://schema.org/BreadcrumbList">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li
                key={index}
                className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                {isLast ? (
                  <span aria-current="page" itemProp="name">
                    {item.name}
                  </span>
                ) : (
                  <Link to={item.to || '/'} itemProp="item">
                    <span itemProp="name">{item.name}</span>
                  </Link>
                )}
                <meta itemProp="position" content={String(index + 1)} />
                {!isLast && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
