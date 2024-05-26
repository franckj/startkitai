export function Prompts() {
	return (
		<section className="card col-span-12 bg-base-100 p-5">
			<p>Here you can manage your prompts for different endpoints.</p>
			<p>Coming soon...</p>
			<p>
				<a className="link" href="https://github.com/orgs/StartKit-AI/discussions/6">
					Join the discussion of this feature on GitHub here and let us know your ideas!
				</a>
			</p>
		</section>
	);
}

Prompts.loader = function () {
	return {};
};
