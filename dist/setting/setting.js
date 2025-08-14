/** @jsx jsx */
import { React, jsx, Immutable, DataSourceManager, QueriableDataSource } from 'jimu-core'
import { AllWidgetSettingProps } from 'jimu-for-builder'
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { AllDataSourceTypes } from 'jimu-core'
import { Checkbox } from 'jimu-ui'
import { IMConfig } from '../config'

interface State {
  selectedDataSourceId: string
  availableFields: Array<{ name: string, alias: string, type: string }>
  loadingFields: boolean
}

export default class Setting extends React.PureComponent<AllWidgetSettingProps<IMConfig>, State> {
  constructor(props) {
    super(props)

    const config = props.config || Immutable({ layerId: '', allowedFields: [] })

    this.state = {
      selectedDataSourceId: config.layerId || '',
      availableFields: [],
      loadingFields: false
    }
  }

  componentDidMount() {
    if (this.props.config?.layerId) {
      this.loadAvailableFields()
    }
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.config?.layerId !== prevProps.config?.layerId &&
      this.props.config?.layerId
    ) {
      this.loadAvailableFields()
    }
  }

  loadAvailableFields = async () => {
    const { config } = this.props
    if (!config?.layerId) return

    this.setState({ loadingFields: true })

    try {
      const dataSource = DataSourceManager.getInstance().getDataSource(config.layerId) as QueriableDataSource

      if (!dataSource || !dataSource.layer) {
        console.warn('DataSource not available or layer missing.')
        this.setState({ loadingFields: false })
        return
      }

      const fields = dataSource.layer.fields || []
      const availableFields = fields
        .filter(field =>
          ['string', 'small-integer', 'integer', 'double'].includes(field.type)
        )
        .map(field => ({
          name: field.name,
          alias: field.alias || field.name,
          type: field.type
        }))

      this.setState({ availableFields, loadingFields: false })
    } catch (error) {
      console.error('Error loading fields:', error)
      this.setState({ loadingFields: false })
    }
  }

  onToggleUseDataEnabled = (useDataSourcesEnabled: boolean) => {
    this.props.onSettingChange({
      id: this.props.id,
      useDataSourcesEnabled
    })
  }

  onDataSourceChange = (useDataSources) => {
    if (!useDataSources || useDataSources.length === 0) return

    const layerId = useDataSources[0]?.dataSourceId || ''

    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('layerId', layerId).set('allowedFields', []),
      useDataSources
    })

    this.setState({ selectedDataSourceId: layerId }, () => {
      this.loadAvailableFields()
    })
  }

  onMapWidgetSelected = (useMapWidgetIds: string[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useMapWidgetIds
    })
  }

  onFieldToggle = (fieldName: string, checked: boolean) => {
    const { config } = this.props
    let allowedFields = config?.allowedFields || []

    if (checked) {
      if (!allowedFields.includes(fieldName)) {
        allowedFields = [...allowedFields, fieldName]
      }
    } else {
      allowedFields = allowedFields.filter(f => f !== fieldName)
    }

    this.props.onSettingChange({
      id: this.props.id,
      config: config.set('allowedFields', allowedFields)
    })
  }

  render() {
    const { config, useDataSources } = this.props
    const { availableFields, loadingFields } = this.state
    const allowedFields = config?.allowedFields || []

    if (!config) {
      return <div style={{ padding: '1rem', color: '#999' }}>Configuration not loaded.</div>
    }

    return (
      <div css={{ width: '100%', height: '100%', padding: '16px' }}>
        {/* Map Selector */}
        <SettingSection title="Map Configuration">
          <SettingRow>
            <div style={{ width: '100%' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                Select Map Widget:
              </label>
              <MapWidgetSelector
                onSelect={this.onMapWidgetSelected}
                useMapWidgetIds={this.props.useMapWidgetIds}
              />
            </div>
          </SettingRow>
        </SettingSection>

        {/* Data Source Selector */}
        <SettingSection title="Data Source Configuration">
          <SettingRow>
            <div style={{ width: '100%' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                Select Layer to Filter:
              </label>
              <DataSourceSelector
                types={Immutable([AllDataSourceTypes.FeatureLayer])}
                useDataSources={useDataSources}
                mustUseDataSource
                onChange={this.onDataSourceChange}
                widgetId={this.props.id}
              />
            </div>
          </SettingRow>

          {config?.layerId && (
            <SettingRow>
              <div style={{
                padding: '12px',
                backgroundColor: '#f0f8ff',
                borderRadius: '4px',
                border: '1px solid #d1ecf1'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#0c5460' }}>
                  <strong>Selected Layer ID:</strong> {config.layerId}
                </p>
              </div>
            </SettingRow>
          )}
        </SettingSection>

        {/* Field Configuration */}
        {config?.layerId && (
          <SettingSection title="Field Configuration">
            <SettingRow>
              <div style={{ width: '100%' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '12px', display: 'block' }}>
                  Select Fields Available to Users:
                </label>

                {loadingFields ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                    Loading available fields...
                  </div>
                ) : availableFields.length > 0 ? (
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    padding: '8px'
                  }}>
                    {availableFields.map(field => (
                      <div key={field.name} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <Checkbox
                          checked={allowedFields.includes(field.name)}
                          onChange={(e) => this.onFieldToggle(field.name, e.target.checked)}
                          style={{ marginRight: '12px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{field.alias}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {field.name} ({field.type})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                    No compatible fields found in the selected layer.
                  </div>
                )}

                {allowedFields.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <strong>Selected Fields ({allowedFields.length}):</strong>
                    <div style={{ marginTop: '4px', fontSize: '12px' }}>
                      {allowedFields.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </SettingRow>
          </SettingSection>
        )}
      </div>
    )
  }
}
