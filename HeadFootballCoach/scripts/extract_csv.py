
from ..models import Region, Nation, State, City, League, Headline, Tournament, Coach, Driver, Team, Player, Game,PlayerTeamSeason, Conference, TeamConference, LeagueSeason, Calendar, GameEvent, PlayerSeasonSkill
import os
from datetime import timedelta, date, datetime
import django.apps


print("Current Working Directory " , os.getcwd())


def run():

    print('in run')

    m = django.apps.apps.get_models()

    N = datetime.now()
    FolderName = "FullCourtHoops/scripts/data_extract/" + N.strftime('%Y%m%d_%H%M%S') + '_DataExtract'
    os.mkdir(FolderName)

    f = None
    for u in m:
        print(u,u.__name__)
        f = open(FolderName + '/'+ u.__name__+'.csv', 'w')

        Headers = u._meta.get_fields()
        headerline = ','.join(Headers)
        f.write(headerline)

        #for o in u.objects.all():
