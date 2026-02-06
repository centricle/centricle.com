#!/usr/bin/env node

/**
 * Build script for content pages
 * Reads markdown files from content/, applies article template, outputs to src/
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';

const CONTENT_DIR = 'content';
const TEMPLATE_PATH = 'src/_templates/article.html';
const OUTPUT_DIR = 'src';

// Configure marked for clean output
marked.setOptions({
    gfm: true,
    breaks: false,
});

function parseDate(dateStr) {
    // Parse date string without timezone conversion
    // Handles both "2026-02-05" and Date objects from gray-matter
    const str = dateStr instanceof Date ? dateStr.toISOString().split('T')[0] : String(dateStr).split('T')[0];
    const [year, month, day] = str.split('-').map(Number);
    return { year, month, day };
}

function formatDate(dateStr) {
    const { year, month, day } = parseDate(dateStr);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[month - 1]} ${day}, ${year}`;
}

function isoDate(dateStr) {
    const { year, month, day } = parseDate(dateStr);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildContent() {
    // Check if content directory exists
    if (!existsSync(CONTENT_DIR)) {
        console.log('No content directory found, skipping content build.');
        return;
    }

    // Read template
    if (!existsSync(TEMPLATE_PATH)) {
        console.error(`Template not found: ${TEMPLATE_PATH}`);
        process.exit(1);
    }
    const template = readFileSync(TEMPLATE_PATH, 'utf-8');

    // Get all markdown files
    const files = readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

    if (files.length === 0) {
        console.log('No markdown files found in content/');
        return;
    }

    console.log(`Building ${files.length} content file(s)...`);

    for (const file of files) {
        const filePath = join(CONTENT_DIR, file);
        const slug = basename(file, '.md');
        const outputPath = join(OUTPUT_DIR, `${slug}.html`);

        // Parse frontmatter and content
        const raw = readFileSync(filePath, 'utf-8');
        const { data: frontmatter, content: markdown } = matter(raw);

        // Validate required frontmatter
        if (!frontmatter.title) {
            console.error(`Missing title in ${file}`);
            continue;
        }

        // Convert markdown to HTML
        const contentHtml = marked(markdown);

        // Apply template
        let html = template
            .replace(/\{\{title\}\}/g, frontmatter.title)
            .replace(/\{\{description\}\}/g, frontmatter.description || '')
            .replace(/\{\{date\}\}/g, frontmatter.date ? isoDate(frontmatter.date) : '')
            .replace(/\{\{dateFormatted\}\}/g, frontmatter.date ? formatDate(frontmatter.date) : '')
            .replace(/\{\{content\}\}/g, contentHtml);

        // Write output
        writeFileSync(outputPath, html);
        console.log(`  ${file} → ${slug}.html`);
    }

    console.log('Content build complete.');
}

buildContent();
