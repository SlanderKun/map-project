interface Props {
  label: string;
  isActive?: boolean;
  onRemove: () => void;
}

const PointButton: React.FC<Props> = ({ label, isActive, onRemove }) => {
  return (
    <button
      onClick={onRemove}
      style={{
        border: '1px solid rgba(0, 0, 0, 1)',
        borderRadius: 10,
        width: 100,
        height: 50,
        background: isActive ? '#0078d4' : 'none',
        color: isActive ? '#fff' : '#c00',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export default PointButton;