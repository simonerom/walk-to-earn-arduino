import _ from 'lodash'
import BigNumber from 'bignumber.js'
import h3 from 'h3-js'
import axios from 'axios'

const H3Areas = [
    4250546.8477,
    607220.9782429,
    86745.8540347,
    12392.2648621,
    1770.3235517,
    252.9033645,
    36.1290521,
    5.1612932,
    0.7373276,
    0.1053325,
    0.0150475,
    0.0021496,
    0.0003071,
    0.0000439,
    0.0000063,
    0.0000009
]

async function getPolygon(address: string) {
  const url = encodeURI(`https://nominatim.openstreetmap.org/search.php?q=${address}&polygon_geojson=1&format=json`)
  const { status, data } = await axios.get(url)
  const d = data.find((v: any) => v.osm_type == 'relation' && v.class == 'boundary' && v.type == 'administrative')
  return {
    polygon: _.get(d, 'geojson.coordinates[0]'),
    box: _.get(d, 'boundingbox')
  }
}

export async function getH3Indexes(address: string) {
  const { polygon, box } = await getPolygon(address)
  const area = new BigNumber(h3.pointDist([box[0], box[2]], [box[0], box[3]], "km"))
    .times(h3.pointDist([box[0], box[2]], [box[1], box[2]], "km"))

  const first = _.findIndex(H3Areas, v => new BigNumber(v).lt(area))

  let resolution = first
  let ids
  for (let i = first; i < 16; i++) {
    ids = h3.polyfill(polygon, i, true)
    if (ids.length >= 3 && ids.length <= 20) {
      resolution = i
      break
    }
  }

  return { resolution, ids }
}