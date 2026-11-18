
import { GoArrowUpRight } from "react-icons/go";
import { FiBookmark } from "react-icons/fi";

function PopularPlaceCard({
    image,
    name,
    description,
    badge,
    large = false
}) {
    return (
        <article className={`popular-place-card ${large ? "large" : ""}`}>
            <div className="popular-place-image">
                <img src={image} alt={name} />

                {badge && (
                    <span className="popular-place-badge">
                        {badge}
                    </span>
                )}

                <button
                    className="popular-place-bookmark"
                    aria-label={`Сохранить ${name}`}
                    type="button"
                >
                    <FiBookmark />
                </button>
            </div>

            <div className="popular-place-info">
                <div>
                    <h3>{name}</h3>
                    <p>{description}</p>
                </div>

                <GoArrowUpRight className="popular-place-arrow" />
            </div>
        </article>
    );
}

export default PopularPlaceCard;
