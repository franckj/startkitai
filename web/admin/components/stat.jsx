import Numeral from 'react-numeral';
import { useMemo } from 'react';

export default function Stat({ title, value, description, type, children }) {
	const val = useMemo(() => {
		if (!value && type === 'currency') {
			return '$0';
		}
		if (value < 10 && type === 'currency') {
			return <Numeral value={value} format="$0.00" />;
		}
		if (value > 1000 && type === 'currency') {
			return <Numeral value={value} format="$0.00a" />;
		}
		if (type === 'currency') {
			return <Numeral value={value} format="$0.00" />;
		}
		if (!value) {
			return '0';
		}
		if (value < 10000) {
			return <Numeral value={value} format="0" />;
		}
		if (type === 'perc') {
			return <Numeral value={value} format="0.0%" />;
		}
		return <Numeral value={value} format="0.0a" />;
	}, [type, value]);

	return (
		<div className="stat">
			<div className="stat-title">{title}</div>
			<div className="stat-value pl-2">{val}</div>
			<div className="stat-desc">{description}</div>
			{children}
		</div>
	);
}

export function CostStat({ value }) {
	if (!value) return '$0.0000';
	return <Numeral value={value} format="$0.0000" />;
}
