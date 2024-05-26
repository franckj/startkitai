import Header from './components/header.jsx';
import { Link } from 'react-router-dom';
import demos from './demos.js';

export default function DemoList() {
	return (
		<div className="bg-base-200 min-h-screen">
			<Header currentPage="Demos" />
			<nav className="py-[64px] px-10">
				<ul className="pt-5 flex flex-wrap flex-row gap-4">
					{demos.map(({ link, description, labels, title, img }) => (
						<Link key={link} to={link}>
							<div className="card w-96 bg-base-100 shadow-lg transition duration-300 ease-in-out hover:shadow-xl ">
								<figure className="border-b h-[165px]">
									<img src={img} alt={title} />
								</figure>
								<div className="card-body min-h-[200px]">
									<h2 className="card-title">{title}</h2>
									<p>{description}</p>
									<div className="card-actions justify-end">
										{labels.map((label) => (
											<div key={label} className="badge badge-ghost">
												{label}
											</div>
										))}
									</div>
								</div>
							</div>
						</Link>
					))}
				</ul>
			</nav>
		</div>
	);
}
