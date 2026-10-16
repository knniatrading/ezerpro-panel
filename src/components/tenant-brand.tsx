/* Marca del negocio: su logo (o una inicial) y su nombre. Reemplaza a la marca EzerPro. */
export function TenantBrand({
  name,
  logo,
  tone = "dark",
}: {
  name: string;
  logo?: string | null;
  tone?: "dark" | "light";
}) {
  return (
    <span className={`tbrand tbrand--${tone}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="tbrand__logo" />
      ) : (
        <span className="tbrand__initial" aria-hidden="true">
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="tbrand__name">{name}</span>
    </span>
  );
}
