import React from 'react';
import { marked } from 'marked';
import { useMemo } from 'react';

const Markdown = ({ markdownText }) => {
	return useMemo(<div dangerouslySetInnerHTML={{ __html: marked(markdownText) }} />, [
		markdownText
	]);
};

export default Markdown;
