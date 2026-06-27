from dependency_injector import containers, providers

from app.core.config import configs
from app.core.database import Database
from app.repository import *
from app.services import *


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        modules=[
            "app.api.v1.endpoints.map",
            "app.api.v1.endpoints.node",
            "app.api.v1.endpoints.edge",
        ]
    )


    db = providers.Singleton(Database, db_url=configs.DATABASE_URI)

    map_repository = providers.Factory(MapRepository, session_factory=db.provided.session)
    node_repository = providers.Factory(NodeRepository, session_factory=db.provided.session)
    edge_repository = providers.Factory(EdgeRepository, session_factory=db.provided.session)

    map_service = providers.Factory(MapService, map_repository=map_repository)
    node_service = providers.Factory(NodeService, node_repository=node_repository)
    edge_service = providers.Factory(EdgeService, edge_repository=edge_repository)
