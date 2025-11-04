import React from 'react';

function Demo() {
	return (
		<div className="container mx-auto p-6">
			<h1 className="text-2xl font-bold mb-6 text-center">דמו</h1>

			<div style={{
				position: 'relative',
				width: '100%',
				height: 0,
				paddingTop: '141.4286%',
				paddingBottom: 0,
				boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
				marginTop: '1.6em',
				marginBottom: '0.9em',
				overflow: 'hidden',
				borderRadius: '8px',
				willChange: 'transform'
			}}>
				<iframe
					loading="lazy"
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						top: 0,
						left: 0,
						border: 'none',
						padding: 0,
						margin: 0
					}}
					src="https://www.canva.com/design/DAG3nicvIh0/VwWW4n6I7hVBAPFdFRcfxw/view?embed"
					allowFullScreen="allowfullscreen"
					allow="fullscreen"
				/>
			</div>

			<div className="text-center mt-4">
				<a
					href="https://www.canva.com/design/DAG3nicvIh0/VwWW4n6I7hVBAPFdFRcfxw/view?utm_content=DAG3nicvIh0&utm_campaign=designshare&utm_medium=embeds&utm_source=link"
					target="_blank"
					rel="noopener"
					className="text-blue-600 hover:underline"
				>
					גימטריה - הערך המספרי של האותיות - כיתות ג׳-ד׳ - דף עבודה
				</a>
				<span className="text-gray-600 mr-2">על ידי gal goldman</span>
			</div>
		</div>
	);
}

export default Demo;