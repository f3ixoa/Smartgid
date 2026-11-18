import "./Footer.css"

function Footer(){

    return(
        <>
            <footer className="main-footer">
                <div className="footer-top">

                    <div className="footer-brand">
                        <h2>Smartgid</h2>
                        <p>
                            Маңғыстауға қош келдіңіз · Откройте свой Мангистау
                        </p>
                    </div>

                    <nav className="footer-navigation">
                        <a href="/about">О регионе</a>
                        <a href="/locations">Места и маршруты</a>
                        <a href="/help">Помощь путешественнику</a>

                        <div className="footer-languages">
                            <a href="#">ҚАЗ</a>
                            <span>/</span>
                            <a href="#">РУС</a>
                            <span>/</span>
                            <a href="#">ENG</a>
                        </div>
                    </nav>

                </div>

                <div className="footer-bottom">
                    <p>
                        © 2026 Smartgid. Путешествуйте с уважением к природе.
                    </p>

                    <a href="/privacy-policy">
                        Политика конфиденциальности
                    </a>
                </div>
            </footer>
        </>
    )
}

export default Footer